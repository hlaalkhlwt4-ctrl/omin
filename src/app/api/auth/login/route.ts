import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, issueSession, setSessionCookie } from '@/lib/auth';
import { z } from 'zod';
import { enforceRateLimit, getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const address = getClientAddress(request);
    enforceRateLimit(`login:${address}`, 10, 15 * 60 * 1000);
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({
      where: { email },
      include: {
        memberships: true,
      },
    });

    if (!user || user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        },
        { status: 403 },
      );
    }

    const activeWorkspaceId = user.memberships[0]?.workspaceId;

    const token = await issueSession(
      { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin, activeWorkspaceId },
      { ipAddress: address, userAgent: request.headers.get('user-agent') || undefined },
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
      },
    });

    setSessionCookie(response, token);

    return response;
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر تسجيل الدخول حاليًا.');
  }
}
