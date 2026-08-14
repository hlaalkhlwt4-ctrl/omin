import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { appUrl, evolutionRequest } from '@/lib/evolution-api';
import { evolutionMessagesFromPayload, persistEvolutionMessagesBatch } from '@/lib/evolution-sync';

export const maxDuration = 30;

export async function POST() {
  try {
    const { workspaceId, role } = await requireWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'inbox:view');
    const channel = await db.channel.findFirst({ where: { workspaceId, provider: 'WHATSAPP', isActive: true } });
    if (!channel) return NextResponse.json({ imported: 0 });
    const config = decryptIntegrationConfig(channel.settingsJson);
    const instanceName = String(config.instanceName || '');
    if (!instanceName) return NextResponse.json({ imported: 0 });

    // Re-assert the webhook on every live-sync cycle. Evolution can lose its
    // webhook after an instance restart/reconnect.
    await evolutionRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: `${appUrl()}/api/webhooks/evolution/${channel.id}?secret=${encodeURIComponent(process.env.EVOLUTION_WEBHOOK_SECRET || '')}`,
          webhookByEvents: false,
          webhook_by_events: false,
          webhookBase64: false,
          events: ['CONNECTION_UPDATE', 'MESSAGES_SET', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE'],
        },
      }),
    }).catch(() => null);

    const firstResponse = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ where: {}, page: 1, offset: 100 }),
    });
    if (!firstResponse.ok) return NextResponse.json({ error: `Evolution HTTP ${firstResponse.status}` }, { status: 502 });
    const firstPayload = await firstResponse.json().catch(() => ({}));
    const envelope = firstPayload?.messages || firstPayload?.data?.messages || firstPayload;
    const totalPages = Math.max(1, Number(envelope?.pages || envelope?.totalPages || firstPayload?.pages || 1));
    let messages = evolutionMessagesFromPayload(firstPayload);
    const pages = [...new Set([2, totalPages - 1, totalPages].filter((page) => page > 1 && page <= totalPages))];
    const responses = await Promise.all(pages.map((page) => evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ where: {}, page, offset: 100 }),
    }).catch(() => null)));
    for (const response of responses) {
      if (response?.ok) messages = messages.concat(evolutionMessagesFromPayload(await response.json().catch(() => ({}))));
    }
    const imported = await persistEvolutionMessagesBatch({ workspaceId, channelId: channel.id, messages });
    return NextResponse.json({ imported });
  } catch (error) {
    console.error('Evolution live sync failed', error);
    return NextResponse.json({ error: 'تعذرت المزامنة الحية.' }, { status: 500 });
  }
}
