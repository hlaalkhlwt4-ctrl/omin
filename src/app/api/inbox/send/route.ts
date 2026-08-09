import { NextRequest, NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { getMessagingAdapter, type ChannelProviderType } from '@/lib/adapters/messaging';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/errors';
import { assertWorkspaceLimit } from '@/lib/plan-limits';

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(10000),
  senderType: z.enum(['USER', 'NOTE']).default('USER'),
});

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, user, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'inbox:reply');
    const parsed = messageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'conversationId و body مطلوبين' }, { status: 400 });
    }
    const { conversationId, body, senderType } = parsed.data;

    if (senderType !== 'NOTE') {
      await assertWorkspaceLimit(workspaceId, 'maxMessages');
    }

    // Verify conversation belongs to workspace
    const conv = await db.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: { channel: true },
    });
    if (!conv) return NextResponse.json({ error: 'المحادثة غير موجودة' }, { status: 404 });

    if (senderType !== 'NOTE') {
      const contact = await db.contact.findFirst({ where: { id: conv.contactId, workspaceId } });
      const recipient = contact?.phone || contact?.email;
      if (!recipient) return NextResponse.json({ error: 'لا توجد وسيلة اتصال صالحة لهذا العميل.' }, { status: 409 });
      const adapter = getMessagingAdapter(conv.channel.provider as ChannelProviderType);
      const config = decryptIntegrationConfig(conv.channel.settingsJson);
      const result = await adapter.sendMessage(config, { recipientId: recipient, body });
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'تعذر الإرسال عبر القناة.' }, { status: 502 });
      }
    }

    const message = await db.message.create({ data: {
      conversationId,
      senderType,
      senderId: user.id,
      channel: senderType === 'NOTE' ? 'INTERNAL_NOTE' : conv.channel.provider,
      body,
    } });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر إرسال الرسالة.');
  }
}
