import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { structuredLog } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const startedAt = Date.now();
  const correlationId = request.headers.get('x-correlation-id') || 'unavailable';
  try {
    await db.$queryRaw`SELECT 1`;
    const detailed = Boolean(process.env.HEALTH_SECRET && request.headers.get('authorization') === `Bearer ${process.env.HEALTH_SECRET}`);
    const base = { status: 'ok', database: 'ok', timestamp: new Date().toISOString(), latencyMs: Date.now() - startedAt };
    if (!detailed) return NextResponse.json(base, { headers: { 'cache-control': 'no-store' } });
    const [pendingJobs, failedJobs, deadLetters, failedWebhooks] = await Promise.all([
      db.backgroundJob.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      db.backgroundJob.count({ where: { status: 'FAILED' } }),
      db.deadLetterEvent.count(),
      db.webhookEvent.count({ where: { status: 'FAILED' } }),
    ]);
    return NextResponse.json({ ...base, uptimeSeconds: Math.round(process.uptime()), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'local', queue: { pendingJobs, failedJobs, deadLetters, failedWebhooks } }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    structuredLog('error', 'health_check_failed', { correlationId, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ status: 'error', database: 'unavailable', timestamp: new Date().toISOString() }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
