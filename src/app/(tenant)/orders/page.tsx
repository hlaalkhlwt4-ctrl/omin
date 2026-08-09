import React from 'react';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { ShoppingBag } from 'lucide-react';
import { OrdersClientView } from './OrdersClientView';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ contactId?: string; conversationId?: string }> }) {
  const { workspaceId } = await requireWorkspaceContext();
  const requested = await searchParams;

  const pipeline = await db.pipeline.findFirst({
    where: { workspaceId, isDefault: true },
    include: { stages: { orderBy: { sortingOrder: 'asc' } } },
  });

  const orders = await db.order.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      stage: true,
      items: true,
      invoices: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const contacts = await db.contact.findMany({
    where: { workspaceId },
    select: { id: true, fullName: true, phone: true },
  });

  const products = await db.product.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, title: true, price: true },
  });

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
            <span>مسار المبيعات والطلبات Pipeline</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة مرنة لجميع مراحل المبيعات والطلبات بنظرة الكانبان التفاعلية أو الجدول.
          </p>
        </div>
      </div>

      <OrdersClientView
        stages={pipeline?.stages || []}
        initialOrders={orders}
        contacts={contacts}
        products={products}
        currency={workspace?.currency || 'SAR'}
        initialContactId={contacts.some((contact) => contact.id === requested.contactId) ? requested.contactId : undefined}
        initialNotes={requested.conversationId ? `تم إنشاء الطلب من المحادثة ${requested.conversationId}` : undefined}
      />
    </div>
  );
}
