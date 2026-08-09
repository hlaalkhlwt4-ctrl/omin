'use client';

import React, { useState } from 'react';
import { LayoutGrid, Table as TableIcon, Plus, X, Loader2, CheckCircle2, Clock } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface OrderItem {
  id: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt: any;
  contact: { fullName: string; phone?: string | null };
  stage: { id: string; name: string };
  items: Array<{ id: string; title: string; quantity: number; price: number }>;
}

interface OrdersClientViewProps {
  stages: Stage[];
  initialOrders: OrderItem[];
  contacts: Array<{ id: string; fullName: string }>;
  products: Array<{ id: string; title: string; price: number }>;
  currency: string;
  initialContactId?: string;
  initialNotes?: string;
}

export function OrdersClientView({
  stages,
  initialOrders,
  contacts,
  products,
  currency,
  initialContactId,
  initialNotes,
}: OrdersClientViewProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [modalOpen, setModalOpen] = useState(Boolean(initialContactId));

  // New Order Form
  const [selectedContactId, setSelectedContactId] = useState(initialContactId || '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState(initialNotes || '');
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !selectedProductId) return;
    setLoading(true);

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContactId,
          stageId: stages[0]?.id,
          items: [{ productId: product.id, title: product.title, price: product.price, quantity }],
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'kanban' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>عرض كانبان Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>عرض الجدول Table</span>
          </button>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء طلب جديد</span>
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageOrders = orders.filter((o) => o.stage?.id === stage.id);
            return (
              <div
                key={stage.id}
                className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 min-w-[240px] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: stage.color }} />
                    <span>{stage.name}</span>
                  </div>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    {stageOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageOrders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{o.contact?.fullName}</span>
                        <span className="text-brand-600">{o.totalAmount} {currency}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {o.items.map((i) => `${i.title} (x${i.quantity})`).join(', ')}
                      </p>
                      <span className="text-[9px] text-slate-400 block text-left">
                        {new Date(o.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">رقم الطلب والعميل</th>
                <th className="p-3.5">المكونات</th>
                <th className="p-3.5">المرحلة</th>
                <th className="p-3.5">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 dark:text-white block">#{o.id.substring(0, 8)}</span>
                    <span className="text-slate-500">{o.contact?.fullName}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    {o.items.map((i) => `${i.title} (x${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-3.5 font-bold text-brand-600">{o.stage?.name}</td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {o.totalAmount} {currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">إنشاء طلب جديد</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">اختر العميل *</label>
                <select
                  required
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="">اختر العميل...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">اختر المنتج / الخدمة *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="">اختر المنتج...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.price} {currency})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">الكمية</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>حفظ وتوليد الطلب</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
