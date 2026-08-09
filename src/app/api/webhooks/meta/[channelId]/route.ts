import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { getMessagingAdapter, type ChannelProviderType } from '@/lib/adapters/messaging';
import { toErrorResponse } from '@/lib/errors';
import { enqueueJob } from '@/lib/jobs';

type RouteContext = { params: Promise<{ channelId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { channelId } = await params;
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  const channel = await db.channel.findUnique({ where: { id: channelId }, select: { id: true } });
  if (!channel || !expected || mode !== 'subscribe' || token !== expected || !challenge) {
    return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { channelId } = await params;
    const channel = await db.channel.findUnique({ where: { id: channelId } });
    if (!channel || !['WHATSAPP', 'INSTAGRAM', 'FACEBOOK'].includes(channel.provider)) {
      return NextResponse.json({ error: 'القناة غير موجودة.' }, { status: 404 });
    }

    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const adapter = getMessagingAdapter(channel.provider as ChannelProviderType);
    if (!adapter.verifyWebhook(headers, rawBody)) {
      await db.channel.update({ where: { id: channel.id }, data: { healthStatus: 'ERROR' } });
      return NextResponse.json({ error: 'توقيع Webhook غير صالح.' }, { status: 401 });
    }

    JSON.parse(rawBody);
    const idempotencyKey = createHash('sha256').update(`${channel.id}:${rawBody}`).digest('hex');
    const existing = await db.webhookEvent.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({ received: true, queued: false }, { status: 202 });
    }
    const event = await db.webhookEvent.create({
      data: {
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        provider: channel.provider,
        idempotencyKey,
        payload: rawBody.slice(0, 500000),
      },
    });
    await enqueueJob({
      workspaceId: channel.workspaceId,
      type: 'WEBHOOK_META',
      payload: { webhookEventId: event.id },
      idempotencyKey: `webhook:${event.id}`,
    });
    return NextResponse.json({ received: true, queued: true }, { status: 202 });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر معالجة Webhook.');
  }
}
