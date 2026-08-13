import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { encryptIntegrationConfig } from '@/lib/integration-secrets';
import { appUrl, evolutionInstanceName, evolutionRequest, isEvolutionConfigured } from '@/lib/evolution-api';

type EvolutionPayload = { qrcode?: { base64?: string }; base64?: string; instance?: { state?: string; status?: string } };

export async function POST() {
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  if (!isEvolutionConfigured()) return NextResponse.json({ error: 'إعدادات Evolution API غير مكتملة.' }, { status: 503 });

  const instanceName = evolutionInstanceName(workspaceId);
  let channel = await db.channel.findFirst({ where: { workspaceId, provider: 'WHATSAPP' } });
  if (!channel) channel = await db.channel.create({ data: { workspaceId, provider: 'WHATSAPP', name: 'WhatsApp Business', isActive: true, healthStatus: 'DISCONNECTED' } });

  const webhookUrl = `${appUrl()}/api/webhooks/evolution/${channel.id}?secret=${encodeURIComponent(process.env.EVOLUTION_WEBHOOK_SECRET!)}`;
  let response = await evolutionRequest('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhook_by_events: false, events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE'] },
    }),
  });
  let payload = await response.json().catch(() => ({})) as EvolutionPayload & { message?: string | string[] };
  if (!response.ok) {
    response = await evolutionRequest(`/instance/connect/${encodeURIComponent(instanceName)}`);
    payload = await response.json().catch(() => ({})) as EvolutionPayload & { message?: string | string[] };
  }
  if (!response.ok) return NextResponse.json({ error: 'تعذر إنشاء جلسة واتساب في Evolution API.' }, { status: 502 });

  const settingsJson = encryptIntegrationConfig({ instanceName, connectedVia: 'EVOLUTION_API' });
  await db.channel.update({ where: { id: channel.id }, data: { settingsJson, isActive: true, healthStatus: 'DISCONNECTED' } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'EVOLUTION_INSTANCE_CREATED', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ instanceName }) } });
  return NextResponse.json({ qrCode: payload.qrcode?.base64 || payload.base64 || null, state: payload.instance?.state || payload.instance?.status || 'connecting' });
}
