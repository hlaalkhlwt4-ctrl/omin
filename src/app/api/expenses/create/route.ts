import { NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/errors';

const expenseSchema = z.object({
  category: z.string().trim().min(1).max(100).default('تشغيلي'),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'finance:manage');
    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من 0.' }, { status: 400 });
    }
    const { category, amount, notes } = parsed.data;

    const expense = await db.expense.create({
      data: {
        workspaceId,
        category: category || 'تشغيلي',
        amount,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر تسجيل المصروف.');
  }
}
