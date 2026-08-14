import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { appUrl, evolutionRequest } from '@/lib/evolution-api';
import { evolutionMessagesFromPayload, persistEvolutionContact, persistEvolutionMessage } from '@/lib/evolution-sync';

export const maxDuration = 60;

export async function POST() {
  try {
    const { workspaceId, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'settings:manage');
    const channel = await db.channel.findFirst({ where: { workspaceId, provider: 'WHATSAPP' } });
    if (!channel) return NextResponse.json({ error: 'قناة واتساب غير موجودة.' }, { status: 404 });
    const config = decryptIntegrationConfig(channel.settingsJson);
    const instanceName = String(config.instanceName || '');
    if (!instanceName) return NextResponse.json({ error: 'اسم جلسة Evolution غير موجود.' }, { status: 400 });

    const webhookUrl = `${appUrl()}/api/webhooks/evolution/${channel.id}?secret=${encodeURIComponent(process.env.EVOLUTION_WEBHOOK_SECRET || '')}`;
    const webhookResponse = await evolutionRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE'],
        },
      }),
    });
    if (!webhookResponse.ok) return NextResponse.json({ error: `تعذر ضبط Webhook (HTTP ${webhookResponse.status}).` }, { status: 502 });

    const [contactsResponse, chatsResponse, response] = await Promise.all([
      evolutionRequest(`/chat/findContacts/${encodeURIComponent(instanceName)}`, { method: 'POST', body: JSON.stringify({ where: {}, take: 5000, skip: 0 }) }),
      evolutionRequest(`/chat/findChats/${encodeURIComponent(instanceName)}`, { method: 'POST', body: JSON.stringify({ where: {}, take: 5000, skip: 0 }) }),
      evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, { method: 'POST', body: JSON.stringify({ where: {}, page: 1, offset: 1000 }) }),
    ]);
    if (!response.ok) return NextResponse.json({ error: `تعذر جلب سجل الرسائل (HTTP ${response.status}).` }, { status: 502 });
    const contactsPayload = contactsResponse.ok ? await contactsResponse.json().catch(() => []) : [];
    const chatsPayload = chatsResponse.ok ? await chatsResponse.json().catch(() => []) : [];
    const contacts = Array.isArray(contactsPayload) ? contactsPayload : Array.isArray(contactsPayload?.data) ? contactsPayload.data : [];
    const chats = Array.isArray(chatsPayload) ? chatsPayload : Array.isArray(chatsPayload?.data) ? chatsPayload.data : [];
    let contactsImported = 0;
    for (const contact of contacts.slice(0, 5000)) {
      if (await persistEvolutionContact({ workspaceId, channelId: channel.id, contact })) contactsImported += 1;
    }
    for (const chat of chats.slice(0, 5000)) {
      await persistEvolutionContact({ workspaceId, channelId: channel.id, contact: chat, createConversation: true });
    }
    const payload = await response.json().catch(() => ({}));
    let imported = 0;
    for (const message of evolutionMessagesFromPayload(payload).slice(0, 1000)) {
      if (await persistEvolutionMessage({ workspaceId, channelId: channel.id, message, rawPayload: message })) imported += 1;
    }
    await db.channel.update({ where: { id: channel.id }, data: { isActive: true, healthStatus: 'CONNECTED' } });
    return NextResponse.json({ imported, contactsImported, message: `تم استيراد ${imported} رسالة و${contactsImported} جهة اتصال، وضبط استقبال الرسائل الجديدة.` });
  } catch (error) {
    console.error('Evolution sync failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذرت مزامنة واتساب.' }, { status: 500 });
  }
}
