import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { evolutionRequest } from '@/lib/evolution-api';

export async function POST() {
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channel = await db.channel.findFirst({ where: { workspaceId, provider: 'WHATSAPP' } });
  if (!channel) return NextResponse.json({ disconnected: true });
  const config = decryptIntegrationConfig(channel.settingsJson);
  const instanceName = String(config.instanceName || '');
  if (instanceName) await evolutionRequest(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: 'DELETE' }).catch(() => null);
  await db.channel.update({ where: { id: channel.id }, data: { healthStatus: 'DISCONNECTED', isActive: false } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'EVOLUTION_INSTANCE_LOGGED_OUT', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ instanceName }) } });
  return NextResponse.json({ disconnected: true });
}
