import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { issueSession, requireAuthContext, revokeSession, setSessionCookie } from '@/lib/auth';
import { getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const user = await requireAuthContext();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'النشاط المحدد غير صالح.' }, { status: 400 });
    }

    const membership = await db.workspaceMember.findFirst({
      where: {
        workspaceId: parsed.data.workspaceId,
        userId: user.id,
        status: 'ACTIVE',
        workspace: { status: { not: 'SUSPENDED' } },
      },
      select: { workspaceId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'لا تملك عضوية نشطة في هذا النشاط.' }, { status: 403 });
    }

    await revokeSession();
    const token = await issueSession(
      {
        userId: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        activeWorkspaceId: membership.workspaceId,
      },
      {
        ipAddress: getClientAddress(request),
        userAgent: request.headers.get('user-agent') || undefined,
      },
    );
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return toErrorResponse(error, 'تعذر تبديل النشاط.');
  }
}
