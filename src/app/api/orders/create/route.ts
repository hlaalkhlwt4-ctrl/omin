import { NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/errors';
import { calculateOrderTotal } from '@/lib/finance';

const orderSchema = z.object({
  contactId: z.string().uuid(),
  stageId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(1).max(160),
    quantity: z.coerce.number().int().positive().max(10000),
    price: z.coerce.number().nonnegative(),
  })).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'orders:create');
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'العميل والمنتجات مطلوبة.' }, { status: 400 });
    }
    const { contactId, stageId, items, notes } = parsed.data;

    const contact = await db.contact.findFirst({ where: { id: contactId, workspaceId }, select: { id: true } });
    if (!contact) return NextResponse.json({ error: 'العميل غير موجود في هذا النشاط.' }, { status: 404 });

    // Default stage if missing
    let targetStageId = stageId;
    if (!targetStageId) {
      const defaultPipeline = await db.pipeline.findFirst({
        where: { workspaceId, isDefault: true },
        include: { stages: { orderBy: { sortingOrder: 'asc' } } },
      });
      targetStageId = defaultPipeline?.stages[0]?.id;
    }
    if (!targetStageId) {
      return NextResponse.json({ error: 'لا يوجد مسار مبيعات مهيأ لهذا النشاط.' }, { status: 409 });
    }

    const validStage = await db.pipelineStage.findFirst({
      where: { id: targetStageId, pipeline: { workspaceId } },
      select: { id: true },
    });
    if (!validStage) return NextResponse.json({ error: 'مرحلة الطلب غير صالحة.' }, { status: 400 });

    const productIds = items.flatMap((item) => item.productId ? [item.productId] : []);
    if (productIds.length > 0) {
      const validProducts = await db.product.count({ where: { id: { in: productIds }, workspaceId } });
      if (validProducts !== new Set(productIds).size) {
        return NextResponse.json({ error: 'أحد المنتجات لا ينتمي لهذا النشاط.' }, { status: 400 });
      }
    }

    const totalAmount = calculateOrderTotal(items);

    const order = await db.order.create({
      data: {
        workspaceId,
        contactId,
        stageId: targetStageId,
        totalAmount,
        paidAmount: 0.0,
        status: 'PENDING',
        notes: notes || null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر إنشاء الطلب.');
  }
}
