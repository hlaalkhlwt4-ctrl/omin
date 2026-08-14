import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { toErrorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { workspaceId, role } = await requireWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'inbox:view');
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    const cursor = req.nextUrl.searchParams.get('cursor');
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || 50), 1), 100);
    if (!conversationId) return NextResponse.json({ error: 'conversationId مطلوب' }, { status: 400 });

    // Verify conversation belongs to workspace
    const conv = await db.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) return NextResponse.json({ error: 'المحادثة غير موجودة' }, { status: 404 });

    const rows = await db.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const messages = [...page].reverse();

    // Mark as read
    await db.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return NextResponse.json({ messages, nextCursor: hasMore ? page[page.length - 1]?.id : null });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر تحميل الرسائل.');
  }
}
