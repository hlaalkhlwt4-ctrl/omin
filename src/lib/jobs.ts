import { db } from './db';
import { structuredLog } from './observability';

export type JobType = 'WEBHOOK_META' | 'CAMPAIGN_SEND' | 'AUTOMATION_TRIGGER';

export async function enqueueJob(input: {
  workspaceId?: string;
  type: JobType;
  payload: unknown;
  runAt?: Date;
  idempotencyKey?: string;
  maxAttempts?: number;
}) {
  const data = {
    workspaceId: input.workspaceId,
    type: input.type,
    payload: JSON.stringify(input.payload),
    runAt: input.runAt || new Date(),
    maxAttempts: input.maxAttempts || 5,
    status: 'PENDING',
    attempts: 0,
    lockedAt: null,
    completedAt: null,
    lastError: null,
  };
  if (input.idempotencyKey) {
    return db.backgroundJob.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: data,
      create: { ...data, idempotencyKey: input.idempotencyKey },
    });
  }
  return db.backgroundJob.create({ data });
}

function retryDate(attempts: number) {
  const delayMs = Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delayMs);
}

export async function processDueJobs(
  handler: (job: { id: string; type: string; workspaceId: string | null; payload: unknown }) => Promise<void>,
  limit = 10,
) {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const recovered = await db.backgroundJob.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: staleBefore } },
    data: { status: 'PENDING', lockedAt: null, runAt: new Date(), lastError: 'Recovered stale processing lock' },
  });
  if (recovered.count) structuredLog('warn', 'jobs_stale_locks_recovered', { count: recovered.count });
  const pending = await db.backgroundJob.findMany({
    where: { status: 'PENDING', runAt: { lte: new Date() } },
    orderBy: { runAt: 'asc' },
    take: Math.min(Math.max(limit, 1), 50),
  });
  const result = { claimed: 0, completed: 0, retried: 0, deadLettered: 0 };

  for (const candidate of pending) {
    const claim = await db.backgroundJob.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    result.claimed += 1;
    const job = await db.backgroundJob.findUniqueOrThrow({ where: { id: candidate.id } });
    try {
      await handler({ id: job.id, type: job.type, workspaceId: job.workspaceId, payload: JSON.parse(job.payload) });
      await db.backgroundJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null },
      });
      result.completed += 1;
      structuredLog('info', 'job_completed', { jobId: job.id, jobType: job.type, workspaceId: job.workspaceId, attempts: job.attempts });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 4000) : 'Unknown job error';
      if (job.attempts >= job.maxAttempts) {
        await db.$transaction([
          db.backgroundJob.update({ where: { id: job.id }, data: { status: 'FAILED', lastError: message, lockedAt: null } }),
          db.deadLetterEvent.create({ data: { workspaceId: job.workspaceId, jobId: job.id, type: job.type, payload: job.payload, attempts: job.attempts, lastError: message } }),
        ]);
        result.deadLettered += 1;
        structuredLog('error', 'job_dead_lettered', { jobId: job.id, jobType: job.type, workspaceId: job.workspaceId, attempts: job.attempts, error: message });
      } else {
        await db.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'PENDING', lastError: message, lockedAt: null, runAt: retryDate(job.attempts) },
        });
        result.retried += 1;
        structuredLog('warn', 'job_retry_scheduled', { jobId: job.id, jobType: job.type, workspaceId: job.workspaceId, attempts: job.attempts, error: message });
      }
    }
  }
  return result;
}
