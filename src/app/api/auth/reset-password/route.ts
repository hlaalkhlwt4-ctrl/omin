import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { enforceRateLimit, getClientAddress } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({ token: z.string().min(32).max(200), password: z.string().min(10).max(128) });

export async function POST(request: Request) {
  try {
    enforceRateLimit(`reset:${getClientAddress(request)}`, 10, 15 * 60 * 1000);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'الرابط أو كلمة المرور غير صالحين.' }, { status: 400 });
    const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
    const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'رابط الاستعادة منتهي أو مستخدم.' }, { status: 400 });
    }
    const passwordHash = await hashPassword(parsed.data.password);
    await db.$transaction([
      db.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر تعيين كلمة المرور.');
  }
}
