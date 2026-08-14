import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({
  conversationId: z.string().uuid(),
  assignedUserId: z.string().uuid().nullable().optional(),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED']).optional(),
}).refine((value) => value.assignedUserId !== undefined || value.status, 'No changes');

export async function GET(request: NextRequest) {
  try {
    const { workspaceId, role } = await requireWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'inbox:view');
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 500), 1), 1000);
    const conversations = await db.conversation.findMany({
      where: { workspaceId },
      include: {
        contact: true,
        channel: true,
        messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    conversations.sort((left, right) => {
      const leftTime = left.messages[0]?.createdAt?.getTime() || left.lastMessageAt.getTime();
      const rightTime = right.messages[0]?.createdAt?.getTime() || right.lastMessageAt.getTime();
      return rightTime - leftTime;
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return toErrorResponse(error, 'تعذر تحديث المحادثات.');
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspaceId, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'inbox:assign');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'بيانات المحادثة غير صالحة.' }, { status: 400 });
    if (parsed.data.assignedUserId) {
      const member = await db.workspaceMember.findFirst({
        where: { workspaceId, userId: parsed.data.assignedUserId, status: 'ACTIVE' },
      });
      if (!member) return NextResponse.json({ error: 'الموظف ليس عضوًا نشطًا في هذا النشاط.' }, { status: 400 });
    }
    const result = await db.conversation.updateMany({
      where: { id: parsed.data.conversationId, workspaceId },
      data: { assignedUserId: parsed.data.assignedUserId, status: parsed.data.status },
    });
    if (!result.count) return NextResponse.json({ error: 'المحادثة غير موجودة.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, 'تعذر تحديث المحادثة.');
  }
}
