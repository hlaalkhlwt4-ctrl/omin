import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['ADMIN', 'SALES', 'SUPPORT', 'ACCOUNTANT', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
}).refine((value) => value.role || value.status, 'No changes');

export async function PATCH(request: Request) {
  try {
    const { workspaceId, user, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'team:manage');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'بيانات العضو غير صالحة.' }, { status: 400 });

    const member = await db.workspaceMember.findFirst({
      where: { id: parsed.data.memberId, workspaceId },
      select: { id: true, userId: true, role: true },
    });
    if (!member) return NextResponse.json({ error: 'العضو غير موجود.' }, { status: 404 });
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'لا يمكن تغيير دور مالك النشاط من هذه الصفحة.' }, { status: 403 });
    }
    if (member.userId === user.id && parsed.data.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'لا يمكنك إيقاف عضويتك الحالية.' }, { status: 409 });
    }

    await db.workspaceMember.update({
      where: { id: member.id },
      data: { role: parsed.data.role, status: parsed.data.status },
    });
    await db.auditLog.create({
      data: {
        workspaceId,
        actorId: user.id,
        action: 'TEAM_MEMBER_UPDATED',
        targetType: 'WORKSPACE_MEMBER',
        targetId: member.id,
        metadata: JSON.stringify({ role: parsed.data.role, status: parsed.data.status }),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, 'تعذر تحديث عضو الفريق.');
  }
}
