import { randomUUID } from 'crypto';
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

function evolutionMessageKey(channelId: string, message: EvolutionMessage) {
  return `evolution:${channelId}:${usableJid(message)}:${message.key?.fromMe ? 'out' : 'in'}:${message.key?.id}`;
}

function phoneFromJid(jid: string) {
  return jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0].replace(/\D/g, '') || null : null;
}

function evolutionContactData(contact: Record<string, unknown>) {
  const rawId = String(contact.remoteJid || contact.id || contact.number || '');
  if (!rawId || rawId.endsWith('@broadcast')) return null;
  const handleId = rawId.includes('@') ? rawId : `${rawId.replace(/\D/g, '')}@s.whatsapp.net`;
  if (!handleId.replace(/\D/g, '')) return null;
  const phone = phoneFromJid(handleId);
  return {
    handleId,
    phone,
    fullName: String(contact.pushName || contact.name || contact.subject || phone || handleId),
    avatarUrl: typeof contact.profilePictureUrl === 'string' ? contact.profilePictureUrl : null,
  };
}

export async function persistEvolutionContactsBatch(input: {
  workspaceId: string;
  channelId: string;
  contacts: Record<string, unknown>[];
  createConversations?: boolean;
}) {
  const normalized = new Map<string, NonNullable<ReturnType<typeof evolutionContactData>>>();
  for (const contact of input.contacts) {
    const item = evolutionContactData(contact);
    if (item) normalized.set(item.handleId, item);
  }
  const handles = [...normalized.keys()];
  if (!handles.length) return { contactsCreated: 0, conversationsCreated: 0, contactIds: new Map<string, string>() };
  const existing = await db.contactChannel.findMany({
    where: { provider: 'WHATSAPP', handleId: { in: handles }, contact: { workspaceId: input.workspaceId } },
    select: { handleId: true, contactId: true },
  });
  const contactIds = new Map(existing.map((item) => [item.handleId, item.contactId]));
  const newItems = handles.filter((handle) => !contactIds.has(handle)).map((handle) => ({ id: randomUUID(), ...normalized.get(handle)! }));
  if (newItems.length) {
    await db.contact.createMany({ data: newItems.map((item) => ({
      id: item.id, workspaceId: input.workspaceId, fullName: item.fullName, phone: item.phone, avatarUrl: item.avatarUrl, source: 'WHATSAPP',
    })) });
    await db.contactChannel.createMany({ data: newItems.map((item) => ({
      id: randomUUID(), contactId: item.id, provider: 'WHATSAPP', handleId: item.handleId, optInStatus: true,
    })) });
    for (const item of newItems) contactIds.set(item.handleId, item.id);
  }
  let conversationsCreated = 0;
  if (input.createConversations) {
    const ids = [...contactIds.values()];
    const existingConversations = await db.conversation.findMany({
      where: { workspaceId: input.workspaceId, channelId: input.channelId, contactId: { in: ids }, status: { not: 'CLOSED' } },
      select: { contactId: true },
    });
    const existingIds = new Set(existingConversations.map((item) => item.contactId));
    const missingIds = ids.filter((id) => !existingIds.has(id));
    if (missingIds.length) {
      const result = await db.conversation.createMany({ data: missingIds.map((contactId) => ({
        id: randomUUID(), workspaceId: input.workspaceId, channelId: input.channelId, contactId,
      })) });
      conversationsCreated = result.count;
    }
  }
  return { contactsCreated: newItems.length, conversationsCreated, contactIds };
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
  const idempotencyKey = evolutionMessageKey(channelId, message);
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
  updateConversationSummaries?: boolean;
}) {
  const unique = new Map<string, EvolutionMessage>();
  for (const message of input.messages) {
    const jid = usableJid(message);
    if (!jid || !message.key?.id || jid.endsWith('@broadcast')) continue;
    unique.set(evolutionMessageKey(input.channelId, message), message);
  }
  const candidates = [...unique.entries()];
  const keys = candidates.map(([key]) => key);
  const existing = await db.message.findMany({ where: { idempotencyKey: { in: keys } }, select: { idempotencyKey: true } });
  const existingKeys = new Set(existing.map((item) => item.idempotencyKey));
  const pending = candidates.filter(([key]) => !existingKeys.has(key));
  if (!pending.length) return 0;
  const groups = new Map<string, Array<{ key: string; message: EvolutionMessage }>>();
  for (const [key, message] of pending) {
    const jid = usableJid(message);
    groups.set(jid, [...(groups.get(jid) || []), { key, message }]);
  }
  const contacts = await persistEvolutionContactsBatch({
    workspaceId: input.workspaceId,
    channelId: input.channelId,
    contacts: [...groups.entries()].map(([id, messages]) => ({ id, pushName: messages.find((item) => item.message.pushName)?.message.pushName })),
  });
  const contactIds = [...contacts.contactIds.values()];
  const existingConversations = await db.conversation.findMany({
    where: { workspaceId: input.workspaceId, channelId: input.channelId, contactId: { in: contactIds }, status: { not: 'CLOSED' } },
    select: { id: true, contactId: true },
  });
  const conversationIds = new Map(existingConversations.map((item) => [item.contactId, item.id]));
  const missingContactIds = contactIds.filter((id) => !conversationIds.has(id));
  if (missingContactIds.length) {
    const rows = missingContactIds.map((contactId) => ({ id: randomUUID(), workspaceId: input.workspaceId, channelId: input.channelId, contactId }));
    await db.conversation.createMany({ data: rows });
    for (const row of rows) conversationIds.set(row.contactId, row.id);
  }
  const messageRows = pending.map(([key, message]) => {
    const contactId = contacts.contactIds.get(usableJid(message))!;
    return {
      conversationId: conversationIds.get(contactId)!,
      senderType: message.key?.fromMe ? 'USER' : 'CONTACT',
      channel: 'WHATSAPP',
      body: messageText(message.message),
      rawPayload: JSON.stringify(message),
      idempotencyKey: key,
      createdAt: messageDate(message.messageTimestamp),
    };
  });
  const result = await db.message.createMany({ data: messageRows });
  const summaries = new Map<string, { latestAt: Date; unread: number }>();
  for (const row of messageRows) {
    const current = summaries.get(row.conversationId) || { latestAt: new Date(0), unread: 0 };
    if (row.createdAt > current.latestAt) current.latestAt = row.createdAt;
    if (row.senderType === 'CONTACT') current.unread += 1;
    summaries.set(row.conversationId, current);
  }
  if (input.updateConversationSummaries !== false) {
    await db.$transaction([...summaries.entries()].map(([id, summary]) => db.conversation.update({
      where: { id }, data: { lastMessageAt: summary.latestAt, ...(summary.unread ? { unreadCount: { increment: summary.unread } } : {}) },
    })));
  }
  return result.count;
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
