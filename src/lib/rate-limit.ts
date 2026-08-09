import { AppError } from './errors';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function getClientAddress(request: Request) {
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new AppError('RATE_LIMITED', 429, 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.');
  }

  current.count += 1;
}
