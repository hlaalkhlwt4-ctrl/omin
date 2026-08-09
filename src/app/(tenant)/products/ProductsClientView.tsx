'use client';

import React, { useState } from 'react';
import { Search, Plus, X, Loader2, Store, Laptop, UserCheck, Briefcase, GraduationCap, Calendar } from 'lucide-react';

interface ProductItem {
  id: string;
  title: string;
  sku?: string | null;
  type: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  isActive: boolean;
}

interface ProductsClientViewProps {
  initialProducts: ProductItem[];
  currency: string;
}

export function ProductsClientView({ initialProducts, currency }: ProductsClientViewProps) {
  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // New Product Form State
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [type, setType] = useState('PHYSICAL');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('100');
  const [loading, setLoading] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;
    setLoading(true);

    try {
      const res = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sku, type, price, costPrice, stockQuantity }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProducts([data.product, ...products]);
      setModalOpen(false);
      setTitle('');
      setPrice('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المنتج أو الـ SKU..."
            className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="PHYSICAL">منتج مادي</option>
            <option value="DIGITAL">منتج رقمي</option>
            <option value="SERVICE">خدمة</option>
            <option value="SUBSCRIPTION">اشتراك</option>
            <option value="COURSE">دورة</option>
            <option value="BOOKING">استشارة / حجز</option>
          </select>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عنصر جديد</span>
          </button>
        </div>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-2 py-0.5 rounded-full">
                  {p.type}
                </span>
                <span className="text-[11px] text-slate-400">SKU: {p.sku || 'غير محدد'}</span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">{p.title}</h3>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">سعر البيع</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {p.price} <span className="text-xs font-normal text-slate-500">{currency}</span>
                </span>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-400 block">المخزون</span>
                <span className="text-xs font-bold text-emerald-600">{p.stockQuantity} وحدة</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">إضافة منتج أو خدمة جديدة</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">اسم المنتج / الخدمة *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="أدخل اسم العنصر"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">النوع</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="PHYSICAL">منتج مادي</option>
                    <option value="DIGITAL">منتج رقمي</option>
                    <option value="SERVICE">خدمة</option>
                    <option value="SUBSCRIPTION">اشتراك</option>
                    <option value="COURSE">دورة</option>
                    <option value="BOOKING">استشارة / حجز</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">SKU (اختياري)</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU-100"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1">سعر البيع *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="350"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">التكلفة</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="180"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">المخزون</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>حفظ المنتج</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
