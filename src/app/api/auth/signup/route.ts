import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { enforceRateLimit, getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';
import { createEmailVerification } from '@/lib/email-verification';

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    const address = getClientAddress(request);
    enforceRateLimit(`signup:${address}`, 5, 15 * 60 * 1000);
    const parsed = signupSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'أدخل اسمًا صحيحًا وبريدًا صالحًا وكلمة مرور من 10 أحرف على الأقل.' },
        { status: 400 }
      );
    }
    const { fullName, email, password } = parsed.data;

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        emailVerified: false,
      },
    });

    const verification = await createEmailVerification(user.id, user.email);
    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        emailSent: verification.sent,
        verificationPreviewUrl: verification.previewUrl,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر إنشاء الحساب حاليًا.');
  }
}
