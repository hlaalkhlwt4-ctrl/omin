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

export async function persistEvolutionContact(input: {
  workspaceId: string;
  channelId: string;
  contact: Record<string, unknown>;
  createConversation?: boolean;
}) {
  const rawId = String(input.contact.remoteJid || input.contact.id || input.contact.number || '');
  if (!rawId || rawId.endsWith('@broadcast')) return false;
  const handleId = rawId.includes('@') ? rawId : `${rawId.replace(/\D/g, '')}@s.whatsapp.net`;
  if (!handleId.replace(/\D/g, '')) return false;
  const phone = phoneFromJid(handleId);
  const fullName = String(input.contact.pushName || input.contact.name || input.contact.subject || phone || handleId);
  const avatarUrl = typeof input.contact.profilePictureUrl === 'string' ? input.contact.profilePictureUrl : null;
  let contactChannel = await db.contactChannel.findFirst({
    where: { provider: 'WHATSAPP', handleId, contact: { workspaceId: input.workspaceId } },
    include: { contact: true },
  });
  let created = false;
  if (!contactChannel) {
    const contact = await db.contact.create({
      data: {
        workspaceId: input.workspaceId,
        fullName,
        phone,
        avatarUrl,
        source: 'WHATSAPP',
        channels: { create: { provider: 'WHATSAPP', handleId, optInStatus: true } },
      },
      include: { channels: true },
    });
    contactChannel = { ...contact.channels[0], contact };
    created = true;
  } else if (fullName !== handleId || avatarUrl) {
    await db.contact.update({ where: { id: contactChannel.contactId }, data: { fullName, phone, avatarUrl } });
  }
  if (input.createConversation) {
    const conversation = await db.conversation.findFirst({
      where: { workspaceId: input.workspaceId, channelId: input.channelId, contactId: contactChannel.contactId, status: { not: 'CLOSED' } },
      select: { id: true },
    });
    if (!conversation) await db.conversation.create({ data: { workspaceId: input.workspaceId, channelId: input.channelId, contactId: contactChannel.contactId } });
  }
  return created;
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

export async function persistEvolutionMessagesBatch(input: {
  workspaceId: string;
  channelId: string;
  messages: EvolutionMessage[];
}) {
  const candidates = input.messages.filter((message) => usableJid(message) && message.key?.id && !usableJid(message).endsWith('@broadcast'));
  const keys = candidates.map((message) => `evolution:${input.channelId}:${message.key!.id}`);
  const existing = await db.message.findMany({ where: { idempotencyKey: { in: keys } }, select: { idempotencyKey: true } });
  const existingKeys = new Set(existing.map((item) => item.idempotencyKey));
  const groups = new Map<string, EvolutionMessage[]>();
  for (const message of candidates) {
    const key = `evolution:${input.channelId}:${message.key!.id}`;
    if (existingKeys.has(key)) continue;
    const jid = usableJid(message);
    groups.set(jid, [...(groups.get(jid) || []), message]);
  }

  let imported = 0;
  const entries = [...groups.entries()];
  for (let index = 0; index < entries.length; index += 10) {
    const counts = await Promise.all(entries.slice(index, index + 10).map(async ([remoteJid, messages]) => {
      await persistEvolutionContact({
        workspaceId: input.workspaceId,
        channelId: input.channelId,
        contact: { id: remoteJid, pushName: messages.find((item) => item.pushName)?.pushName },
      });
      const contactChannel = await db.contactChannel.findFirstOrThrow({
        where: { provider: 'WHATSAPP', handleId: remoteJid, contact: { workspaceId: input.workspaceId } },
      });
      let conversation = await db.conversation.findFirst({
        where: { workspaceId: input.workspaceId, channelId: input.channelId, contactId: contactChannel.contactId, status: { not: 'CLOSED' } },
        orderBy: { lastMessageAt: 'desc' },
      });
      const latestAt = messages.reduce((latest, message) => {
        const date = messageDate(message.messageTimestamp);
        return date > latest ? date : latest;
      }, new Date(0));
      conversation ||= await db.conversation.create({
        data: { workspaceId: input.workspaceId, channelId: input.channelId, contactId: contactChannel.contactId, lastMessageAt: latestAt },
      });
      const result = await db.message.createMany({
        data: messages.map((message) => ({
          conversationId: conversation.id,
          senderType: message.key?.fromMe ? 'USER' : 'CONTACT',
          channel: 'WHATSAPP',
          body: messageText(message.message),
          rawPayload: JSON.stringify(message),
          idempotencyKey: `evolution:${input.channelId}:${message.key!.id}`,
          createdAt: messageDate(message.messageTimestamp),
        })),
      });
      const unread = messages.filter((message) => !message.key?.fromMe).length;
      await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: latestAt, ...(unread ? { unreadCount: { increment: unread } } : {}) },
      });
      return result.count;
    }));
    imported += counts.reduce((total, count) => total + count, 0);
  }
  return imported;
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
