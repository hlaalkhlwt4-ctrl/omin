import { NextRequest, NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { getMessagingAdapter, type ChannelProviderType, type SendMessageResult } from '@/lib/adapters/messaging';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/errors';
import { assertWorkspaceLimit } from '@/lib/plan-limits';
import { evolutionLidFromRawPayload, evolutionMessageIdempotencyKey } from '@/lib/evolution-sync';

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
      include: {
        channel: true,
        contact: { include: { channels: { where: { provider: 'WHATSAPP' } } } },
        messages: {
          where: { channel: 'WHATSAPP', rawPayload: { not: null } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
          select: { rawPayload: true },
        },
      },
    });
    if (!conv) return NextResponse.json({ error: 'المحادثة غير موجودة' }, { status: 404 });

    let providerResult: SendMessageResult | null = null;
    if (senderType !== 'NOTE') {
      const whatsappLid = conv.contact.channels.find((item) => item.handleId.endsWith('@lid'))?.handleId
        || conv.messages.map((message) => evolutionLidFromRawPayload(message.rawPayload)).find(Boolean);
      const whatsappPhoneJid = conv.contact.channels.find((item) => item.handleId.endsWith('@s.whatsapp.net'))?.handleId;
      const recipients = conv.channel.provider === 'WHATSAPP'
        ? [...new Set([whatsappLid, whatsappPhoneJid, conv.contact.channels[0]?.handleId, conv.contact.phone].filter((item): item is string => Boolean(item)))]
        : [conv.contact.email || conv.contact.phone].filter((item): item is string => Boolean(item));
      if (!recipients.length) return NextResponse.json({ error: 'لا توجد وسيلة اتصال صالحة لهذا العميل.' }, { status: 409 });
      const adapter = getMessagingAdapter(conv.channel.provider as ChannelProviderType);
      const config = decryptIntegrationConfig(conv.channel.settingsJson);
      let recipient = recipients[0];
      for (const candidate of recipients) {
        recipient = candidate;
        providerResult = await adapter.sendMessage(config, { recipientId: candidate, body });
        if (providerResult.success) break;
      }
      if (!providerResult?.success) {
        console.error('Outbound message rejected by provider', {
          workspaceId,
          conversationId,
          channelId: conv.channel.id,
          provider: conv.channel.provider,
          recipientType: recipient.endsWith('@lid') ? 'lid' : recipient.includes('@') ? 'jid' : 'phone',
          error: providerResult?.error,
        });
        return NextResponse.json({ error: providerResult?.error || 'تعذر الإرسال عبر القناة.' }, { status: 502 });
      }
      console.info('Outbound message accepted by provider', {
        workspaceId,
        conversationId,
        channelId: conv.channel.id,
        provider: conv.channel.provider,
        recipientType: recipient.endsWith('@lid') ? 'lid' : recipient.includes('@') ? 'jid' : 'phone',
        providerMessageId: providerResult.messageId,
      });
    }
    const responseKey = providerResult?.providerRawResponse?.key || providerResult?.providerRawResponse?.message?.key || {};
    const fallbackLid = conv.contact.channels.find((item) => item.handleId.endsWith('@lid'))?.handleId
      || conv.messages.map((message) => evolutionLidFromRawPayload(message.rawPayload)).find(Boolean);
    const fallbackPhoneJid = conv.contact.channels.find((item) => item.handleId.endsWith('@s.whatsapp.net'))?.handleId;
    const remoteJid = String(responseKey.remoteJid || fallbackLid || fallbackPhoneJid || '');
    const idempotencyKey = providerResult?.messageId && remoteJid
      ? evolutionMessageIdempotencyKey(conv.channel.id, {
        key: {
          id: providerResult.messageId,
          fromMe: true,
          remoteJid,
          remoteJidAlt: String(responseKey.remoteJidAlt || (remoteJid.endsWith('@lid') ? fallbackPhoneJid || '' : '')),
        },
      })
      : undefined;
    const messageData = {
      conversationId,
      senderType,
      senderId: user.id,
      channel: senderType === 'NOTE' ? 'INTERNAL_NOTE' : conv.channel.provider,
      body,
      idempotencyKey,
      rawPayload: providerResult ? JSON.stringify(providerResult.providerRawResponse || {}) : undefined,
    };
    const message = idempotencyKey
      ? await db.message.upsert({ where: { idempotencyKey }, update: {}, create: messageData })
      : await db.message.create({ data: messageData });

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
