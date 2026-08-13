import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { decryptIntegrationConfig } from '@/lib/integration-secrets';
import { evolutionRequest, isEvolutionConfigured } from '@/lib/evolution-api';

export async function GET() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  if (!isEvolutionConfigured()) return NextResponse.json({ configured: false, state: 'unconfigured' });
  const channel = await db.channel.findFirst({ where: { workspaceId, provider: 'WHATSAPP' } });
  const config = channel?.settingsJson ? decryptIntegrationConfig(channel.settingsJson) : {};
  const instanceName = String(config.instanceName || '');
  if (!channel || !instanceName) return NextResponse.json({ configured: true, state: 'new' });

  const response = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
  if (!response.ok) return NextResponse.json({ configured: true, state: 'close' });
  const payload = await response.json() as { instance?: { state?: string } };
  const state = payload.instance?.state || 'close';
  const connected = state === 'open';
  if ((channel.healthStatus === 'CONNECTED') !== connected) {
    await db.channel.update({ where: { id: channel.id }, data: { healthStatus: connected ? 'CONNECTED' : 'DISCONNECTED', isActive: true } });
  }
  return NextResponse.json({ configured: true, state, connected });
}
