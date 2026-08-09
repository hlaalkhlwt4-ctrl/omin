import React from 'react';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { ShoppingBag } from 'lucide-react';
import { ProductsClientView } from './ProductsClientView';

export default async function ProductsPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const products = await db.product.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            <span>إدارة المنتجات والخدمات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            دعم كامل للمنتجات المادية، الرقمية، الدورات، والخدمات والاستشارات.
          </p>
        </div>
      </div>

      <ProductsClientView initialProducts={products} currency={workspace?.currency || 'SAR'} />
    </div>
  );
}
