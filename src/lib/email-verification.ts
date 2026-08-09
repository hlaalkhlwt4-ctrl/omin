import { createHash, randomBytes } from 'crypto';
import { db } from './db';
import { sendEmailVerificationEmail } from './email';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function hashOneTimeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerification(userId: string, email: string) {
  await db.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = randomBytes(32).toString('hex');
  await db.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashOneTimeToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });

  const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const sent = await sendEmailVerificationEmail(email, verificationUrl);

  return {
    sent,
    previewUrl: process.env.NODE_ENV === 'production' ? undefined : verificationUrl,
  };
}
