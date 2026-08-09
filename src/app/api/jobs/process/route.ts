import { NextResponse } from 'next/server';
import { processDueJobs } from '@/lib/jobs';
import { handleBackgroundJob } from '@/lib/job-handlers';

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

async function processJobs(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await processDueJobs(handleBackgroundJob, 10);
  return NextResponse.json(result);
}

export const GET = processJobs;
export const POST = processJobs;
