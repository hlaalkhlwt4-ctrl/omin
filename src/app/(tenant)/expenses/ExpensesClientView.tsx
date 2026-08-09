'use client';

import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: any;
  notes?: string | null;
}

export function ExpensesClientView({ initialExpenses, currency }: { initialExpenses: ExpenseItem[]; currency: string }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('تشغيلي');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, amount, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExpenses([data.expense, ...expenses]);
      setModalOpen(false);
      setAmount('');
      setNotes('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/20">
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm text-xs">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800 text-slate-500">
            <tr>
              <th className="p-4">التصنيف</th>
              <th className="p-4">المبلغ</th>
              <th className="p-4">التاريخ</th>
              <th className="p-4">الملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.length > 0 ? (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{e.category}</td>
                  <td className="p-4 font-extrabold text-rose-600">{e.amount} {currency}</td>
                  <td className="p-4 text-slate-500">{new Date(e.expenseDate).toLocaleDateString('ar-SA')}</td>
                  <td className="p-4 text-slate-500 max-w-[200px] truncate">{e.notes || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  لم يتم تسجيل أي مصاريف بعد. سجّل أول مصروف لحساب صافي الأرباح.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">تسجيل مصروف جديد</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">التصنيف</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold">
                  <option value="تشغيلي">مصاريف تشغيلية</option>
                  <option value="التسويق والإعلانات">التسويق والإعلانات</option>
                  <option value="الشحن والتوصيل">الشحن والتوصيل</option>
                  <option value="الرواتب">الرواتب والأجور</option>
                  <option value="البرمجيات والاشتراكات">البرمجيات والاشتراكات</option>
                  <option value="متنوع">متنوع</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">المبلغ ({currency}) *</label>
                <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="300" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl" />
              </div>
              <div>
                <label className="font-bold block mb-1">ملاحظات (اختياري)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="وصف المصروف" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>حفظ المصروف</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
