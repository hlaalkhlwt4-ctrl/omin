import { NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/errors';

const productSchema = z.object({
  title: z.string().trim().min(1).max(160),
  sku: z.string().trim().max(80).optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE', 'SUBSCRIPTION', 'COURSE', 'BOOKING']).default('PHYSICAL'),
  price: z.coerce.number().nonnegative(),
  costPrice: z.coerce.number().nonnegative().default(0),
  stockQuantity: z.coerce.number().int().nonnegative().default(100),
});

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'orders:create');
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'اسم المنتج والسعر مطلوبان.' }, { status: 400 });
    }
    const { title, sku, type, price, costPrice, stockQuantity } = parsed.data;

    const product = await db.product.create({
      data: {
        workspaceId,
        title,
        sku: sku || null,
        type: type || 'PHYSICAL',
        price,
        costPrice,
        stockQuantity,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر إنشاء المنتج.');
  }
}
