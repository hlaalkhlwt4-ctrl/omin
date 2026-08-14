import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { evolutionRequest } from '@/lib/evolution-api';
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

    const firstResponse = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({ where: {}, page: 1, offset: 250 }),
    });
    if (!firstResponse.ok) return NextResponse.json({ error: `Evolution HTTP ${firstResponse.status}` }, { status: 502 });
    const firstPayload = await firstResponse.json().catch(() => ({}));
    const envelope = firstPayload?.messages || firstPayload?.data?.messages || firstPayload;
    const totalPages = Math.max(1, Number(envelope?.pages || 1));
    let messages = evolutionMessagesFromPayload(firstPayload);
    if (totalPages > 1) {
      const lastResponse = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        body: JSON.stringify({ where: {}, page: totalPages, offset: 250 }),
      });
      if (lastResponse.ok) messages = messages.concat(evolutionMessagesFromPayload(await lastResponse.json().catch(() => ({}))));
    }
    const imported = await persistEvolutionMessagesBatch({ workspaceId, channelId: channel.id, messages });
    return NextResponse.json({ imported });
  } catch (error) {
    console.error('Evolution live sync failed', error);
    return NextResponse.json({ error: 'تعذرت المزامنة الحية.' }, { status: 500 });
  }
}
