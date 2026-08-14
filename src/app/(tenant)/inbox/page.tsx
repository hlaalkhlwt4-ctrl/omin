import React from 'react';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { MessageSquare } from 'lucide-react';
import { InboxClientView } from './InboxClientView';

export default async function InboxPage() {
  const { workspaceId, user } = await requireWorkspaceContext();

  const conversations = await db.conversation.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      channel: true,
      messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
    },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
  });

  const savedReplies = await db.savedReply.findMany({
    where: { workspaceId },
  });

  const teamMembers = await db.workspaceMember.findMany({
    where: { workspaceId, status: 'ACTIVE' },
    include: { user: { select: { id: true, fullName: true } } },
  });

  conversations.sort((left, right) => {
    const leftTime = left.messages[0]?.createdAt?.getTime() || left.lastMessageAt.getTime();
    const rightTime = right.messages[0]?.createdAt?.getTime() || right.lastMessageAt.getTime();
    return rightTime - leftTime;
  });

  return (
    <div className="h-[calc(100vh-8rem)]">
      <InboxClientView
        initialConversations={conversations}
        savedReplies={savedReplies}
        currentUserId={user.id}
        workspaceId={workspaceId}
        teamMembers={teamMembers.map((membership) => membership.user)}
      />
    </div>
  );
}
