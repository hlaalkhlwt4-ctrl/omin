import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { enforceRateLimit, getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()) });

export async function POST(request: Request) {
  try {
    enforceRateLimit(`forgot:${getClientAddress(request)}`, 5, 15 * 60 * 1000);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'أدخل بريدًا إلكترونيًا صالحًا.' }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    let previewUrl: string | undefined;
    if (user) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
      const baseUrl = process.env.APP_URL || new URL(request.url).origin;
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const sent = await sendPasswordResetEmail(user.email, resetUrl);
      if (!sent && process.env.NODE_ENV === 'development') previewUrl = resetUrl;
    }
    return NextResponse.json({ success: true, message: 'إذا كان البريد مسجلًا فستصلك تعليمات الاستعادة.', previewUrl });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر بدء استعادة كلمة المرور.');
  }
}
