import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { appUrl, evolutionRequest } from '@/lib/evolution-api';
import { evolutionMessagesFromPayload, persistEvolutionMessage } from '@/lib/evolution-sync';

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
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhook_by_events: false,
        webhookBase64: false,
        base64: false,
        events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE'],
      }),
    });
    if (!webhookResponse.ok) return NextResponse.json({ error: `تعذر ضبط Webhook (HTTP ${webhookResponse.status}).` }, { status: 502 });

    const response = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({ where: {}, page: 1, offset: 1000 }),
    });
    if (!response.ok) return NextResponse.json({ error: `تعذر جلب سجل الرسائل (HTTP ${response.status}).` }, { status: 502 });
    const payload = await response.json().catch(() => ({}));
    let imported = 0;
    for (const message of evolutionMessagesFromPayload(payload).slice(0, 1000)) {
      if (await persistEvolutionMessage({ workspaceId, channelId: channel.id, message, rawPayload: message })) imported += 1;
    }
    await db.channel.update({ where: { id: channel.id }, data: { isActive: true, healthStatus: 'CONNECTED' } });
    return NextResponse.json({ imported, message: `تم استيراد ${imported} رسالة وضبط استقبال الرسائل الجديدة.` });
  } catch (error) {
    console.error('Evolution sync failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذرت مزامنة واتساب.' }, { status: 500 });
  }
}
