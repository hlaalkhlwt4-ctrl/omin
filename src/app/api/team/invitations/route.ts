import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { assertWorkspaceLimit } from '@/lib/plan-limits';
import { hashOneTimeToken } from '@/lib/email-verification';
import { sendWorkspaceInvitationEmail } from '@/lib/email';
import { toErrorResponse } from '@/lib/errors';

const invitationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  role: z.enum(['ADMIN', 'SALES', 'SUPPORT', 'ACCOUNTANT', 'VIEWER']),
});

export async function POST(request: Request) {
  try {
    const { workspaceId, workspaceStatus, user, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'team:manage');
    const parsed = invitationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'أدخل بريدًا ودورًا صالحين.' }, { status: 400 });
    }
    if (workspaceStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'لا يمكن إرسال دعوات من نشاط غير نشط.' }, { status: 409 });
    }

    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    if (!workspace) return NextResponse.json({ error: 'النشاط غير موجود.' }, { status: 404 });

    const existingUser = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { memberships: { where: { workspaceId }, select: { id: true } } },
    });
    if (existingUser?.memberships.length) {
      return NextResponse.json({ error: 'هذا المستخدم عضو في النشاط بالفعل.' }, { status: 409 });
    }

    await db.workspaceInvitation.updateMany({
      where: { workspaceId, email: parsed.data.email, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    await assertWorkspaceLimit(workspaceId, 'maxUsers');

    const token = randomBytes(32).toString('hex');
    const invitation = await db.workspaceInvitation.create({
      data: {
        workspaceId,
        email: parsed.data.email,
        role: parsed.data.role,
        tokenHash: hashOneTimeToken(token),
        invitedByUserId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const invitationUrl = `${baseUrl}/invitations/accept?token=${encodeURIComponent(token)}`;
    const sent = await sendWorkspaceInvitationEmail(parsed.data.email, invitationUrl, workspace.name);

    await db.auditLog.create({
      data: {
        workspaceId,
        actorId: user.id,
        action: 'TEAM_INVITATION_CREATED',
        targetType: 'WORKSPACE_INVITATION',
        targetId: invitation.id,
        metadata: JSON.stringify({ email: parsed.data.email, role: parsed.data.role, sent }),
      },
    });

    return NextResponse.json({
      success: true,
      sent,
      previewUrl: process.env.NODE_ENV === 'production' ? undefined : invitationUrl,
    });
  } catch (error) {
    return toErrorResponse(error, 'تعذر إنشاء دعوة الفريق.');
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspaceId, user, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'team:manage');
    const parsed = z.object({ invitationId: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'الدعوة غير صالحة.' }, { status: 400 });
    const result = await db.workspaceInvitation.updateMany({
      where: { id: parsed.data.invitationId, workspaceId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    if (!result.count) return NextResponse.json({ error: 'الدعوة غير موجودة.' }, { status: 404 });
    await db.auditLog.create({
      data: {
        workspaceId,
        actorId: user.id,
        action: 'TEAM_INVITATION_REVOKED',
        targetType: 'WORKSPACE_INVITATION',
        targetId: parsed.data.invitationId,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, 'تعذر إلغاء الدعوة.');
  }
}
