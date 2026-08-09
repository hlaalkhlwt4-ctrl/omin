import React from 'react';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { ExpensesClientView } from './ExpensesClientView';

export default async function ExpensesPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const expenses = await db.expense.findMany({
    where: { workspaceId },
    orderBy: { expenseDate: 'desc' },
  });

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  const currency = workspace?.currency || 'SAR';

  // Financial Summary
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const monthOrders = await db.order.findMany({
    where: { workspaceId, createdAt: { gte: firstDayOfMonth } },
  });
  const monthRevenue = monthOrders.reduce((a, o) => a + o.totalAmount, 0);

  const monthExpenses = expenses.filter(
    (e) => new Date(e.expenseDate) >= firstDayOfMonth
  );
  const monthExpenseTotal = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = monthRevenue - monthExpenseTotal;
  const profitMargin = monthRevenue > 0 ? ((netProfit / monthRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-rose-600" />
          <span>المصاريف التشغيلية وصافي الأرباح</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          إدارة مالية تشغيلية قابلة للتوسع. الحساب على أساس نقدي (Cash Basis): الإيراد المؤكد − تكلفة العناصر والمصاريف.
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>إيرادات الشهر</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {monthRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>مصاريف الشهر</span>
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {monthExpenseTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-brand-900 to-sky-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-brand-200">
            <span>صافي الربح التشغيلي</span>
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold">
            {netProfit.toLocaleString()} <span className="text-xs font-normal text-brand-200">{currency}</span>
          </div>
          <div className="text-[11px] text-brand-300">هامش الربح: {profitMargin}%</div>
        </div>
      </div>

      <ExpensesClientView initialExpenses={expenses} currency={currency} />
    </div>
  );
}
