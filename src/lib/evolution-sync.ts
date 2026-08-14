import { db } from './db';

type EvolutionMessage = {
  key?: { id?: string; remoteJid?: string; remoteJidAlt?: string; fromMe?: boolean };
  pushName?: string | null;
  message?: Record<string, unknown>;
  messageType?: string;
  messageTimestamp?: number | string;
};

function messageText(message: Record<string, unknown> | undefined) {
  if (!message) return '[رسالة غير نصية]';
  const extended = message.extendedTextMessage as { text?: string } | undefined;
  const image = message.imageMessage as { caption?: string } | undefined;
  const video = message.videoMessage as { caption?: string } | undefined;
  const document = message.documentMessage as { fileName?: string; caption?: string } | undefined;
  const button = message.buttonsResponseMessage as { selectedDisplayText?: string } | undefined;
  const list = message.listResponseMessage as { title?: string; singleSelectReply?: { selectedRowId?: string } } | undefined;
  return String(
    message.conversation || extended?.text || image?.caption || video?.caption || document?.caption ||
    document?.fileName || button?.selectedDisplayText || list?.title || list?.singleSelectReply?.selectedRowId ||
    '[وسائط/ملف]',
  );
}

function usableJid(message: EvolutionMessage) {
  const jid = String(message.key?.remoteJid || '');
  const alternative = String(message.key?.remoteJidAlt || '');
  if (jid.endsWith('@lid') && alternative.endsWith('@s.whatsapp.net')) return alternative;
  return jid;
}

function phoneFromJid(jid: string) {
  return jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0].replace(/\D/g, '') || null : null;
}

function messageDate(value: EvolutionMessage['messageTimestamp']) {
  const timestamp = Number(value || 0);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date();
  return new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp);
}

export async function persistEvolutionMessage(input: {
  workspaceId: string;
  channelId: string;
  message: EvolutionMessage;
  rawPayload?: unknown;
}) {
  const { workspaceId, channelId, message } = input;
  const remoteJid = usableJid(message);
  const providerId = String(message.key?.id || '');
  if (!remoteJid || !providerId || remoteJid.endsWith('@broadcast')) return false;
  const idempotencyKey = `evolution:${channelId}:${providerId}`;
  if (await db.message.findUnique({ where: { idempotencyKey }, select: { id: true } })) return false;

  let contactChannel = await db.contactChannel.findFirst({
    where: { provider: 'WHATSAPP', handleId: remoteJid, contact: { workspaceId } },
    include: { contact: true },
  });
  if (!contactChannel) {
    const phone = phoneFromJid(remoteJid);
    const contact = await db.contact.create({
      data: {
        workspaceId,
        fullName: String(message.pushName || phone || remoteJid),
        phone,
        source: 'WHATSAPP',
        channels: { create: { provider: 'WHATSAPP', handleId: remoteJid, optInStatus: true } },
      },
      include: { channels: true },
    });
    contactChannel = { ...contact.channels[0], contact };
  } else if (message.pushName && contactChannel.contact.fullName === contactChannel.handleId) {
    await db.contact.update({ where: { id: contactChannel.contactId }, data: { fullName: message.pushName } });
  }

  let conversation = await db.conversation.findFirst({
    where: { workspaceId, channelId, contactId: contactChannel.contactId, status: { not: 'CLOSED' } },
    orderBy: { lastMessageAt: 'desc' },
  });
  const createdAt = messageDate(message.messageTimestamp);
  conversation ||= await db.conversation.create({
    data: { workspaceId, channelId, contactId: contactChannel.contactId, lastMessageAt: createdAt },
  });
  try {
    await db.$transaction([
      db.message.create({
        data: {
          conversationId: conversation.id,
          senderType: message.key?.fromMe ? 'USER' : 'CONTACT',
          channel: 'WHATSAPP',
          body: messageText(message.message),
          rawPayload: JSON.stringify(input.rawPayload ?? message),
          idempotencyKey,
          createdAt,
        },
      }),
      db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: createdAt,
          ...(!message.key?.fromMe ? { unreadCount: { increment: 1 } } : {}),
        },
      }),
    ]);
    return true;
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return false;
    throw error;
  }
}

export function evolutionMessagesFromPayload(payload: unknown): EvolutionMessage[] {
  if (!payload || typeof payload !== 'object') return [];
  const body = payload as { data?: unknown; messages?: { records?: unknown[] }; records?: unknown[] };
  const data = body.data;
  if (Array.isArray(data)) return data as EvolutionMessage[];
  if (data && typeof data === 'object') {
    const wrapped = data as { messages?: { records?: unknown[] }; records?: unknown[] };
    if (Array.isArray(wrapped.messages?.records)) return wrapped.messages.records as EvolutionMessage[];
    if (Array.isArray(wrapped.records)) return wrapped.records as EvolutionMessage[];
    return [data as EvolutionMessage];
  }
  if (Array.isArray(body.messages?.records)) return body.messages.records as EvolutionMessage[];
  if (Array.isArray(body.records)) return body.records as EvolutionMessage[];
  return [];
}
