import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evolutionMessagesFromPayload, persistEvolutionMessage } from '@/lib/evolution-sync';

function validSecret(received: string) {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET || '';
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return Boolean(expected) && left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest, context: { params: Promise<{ channelId: string }> }) {
  if (!validSecret(request.nextUrl.searchParams.get('secret') || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { channelId } = await context.params;
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.provider !== 'WHATSAPP') return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  const payload = await request.json().catch(() => null) as { event?: string; data?: { state?: string }; instance?: string } | null;
  if (!payload) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const event = String(payload.event || '').toUpperCase().replace(/\./g, '_');
  if (event === 'CONNECTION_UPDATE') {
    const state = String(payload.data?.state || '');
    await db.channel.update({ where: { id: channel.id }, data: { healthStatus: state === 'open' ? 'CONNECTED' : 'DISCONNECTED', isActive: state === 'open' } });
    console.info('Evolution connection update', { channelId: channel.id, state });
  }
  let imported = 0;
  if (['MESSAGES_UPSERT', 'SEND_MESSAGE', 'MESSAGES_SET'].includes(event)) {
    const messages = evolutionMessagesFromPayload(payload).slice(0, 1000);
    for (const message of messages) {
      if (await persistEvolutionMessage({ workspaceId: channel.workspaceId, channelId: channel.id, message, rawPayload: payload })) imported += 1;
    }
    console.info('Evolution message webhook processed', { channelId: channel.id, event, received: messages.length, imported });
  }
  return NextResponse.json({ received: true, imported });
}
