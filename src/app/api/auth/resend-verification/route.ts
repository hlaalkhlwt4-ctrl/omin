import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createEmailVerification } from '@/lib/email-verification';
import { enforceRateLimit, getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  try {
    enforceRateLimit(`verify-email:${getClientAddress(request)}`, 5, 15 * 60 * 1000);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'أدخل بريدًا إلكترونيًا صالحًا.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const verification = await createEmailVerification(user.id, user.email);
    return NextResponse.json({
      success: true,
      emailSent: verification.sent,
      verificationPreviewUrl: verification.previewUrl,
    });
  } catch (error) {
    return toErrorResponse(error, 'تعذر إعادة إرسال رابط التأكيد.');
  }
}
