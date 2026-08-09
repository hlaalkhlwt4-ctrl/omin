import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashOneTimeToken } from '@/lib/email-verification';
import { issueSession, requireAuthContext, revokeSession, setSessionCookie } from '@/lib/auth';
import { getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: Request) {
  try {
    const user = await requireAuthContext();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'رابط الدعوة غير صالح.' }, { status: 400 });

    const invitation = await db.workspaceInvitation.findUnique({
      where: { tokenHash: hashOneTimeToken(parsed.data.token) },
    });
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'الدعوة غير موجودة أو انتهت صلاحيتها.' }, { status: 410 });
    }
    if (invitation.email !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'سجّل الدخول بالبريد الذي استلم الدعوة.' }, { status: 403 });
    }

    await db.$transaction([
      db.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
        update: { role: invitation.role, status: 'ACTIVE', joinedAt: new Date() },
        create: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      }),
      db.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);

    await revokeSession();
    const token = await issueSession(
      {
        userId: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        activeWorkspaceId: invitation.workspaceId,
      },
      { ipAddress: getClientAddress(request), userAgent: request.headers.get('user-agent') || undefined },
    );
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return toErrorResponse(error, 'تعذر قبول الدعوة.');
  }
}
