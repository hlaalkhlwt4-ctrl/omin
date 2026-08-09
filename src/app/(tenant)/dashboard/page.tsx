import React from 'react';
import Link from 'next/link';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateNetCashflow } from '@/lib/finance';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  MessageSquare,
  Users,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

export default async function DashboardPage() {
  const { workspaceId, user, role } = await requireWorkspaceContext();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  // Calculate Real DB Metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // 1. Sales & Orders Metrics
  const totalOrdersCount = await db.order.count({ where: { workspaceId } });
  const completedOrdersCount = await db.order.count({
    where: { workspaceId, status: 'COMPLETED' },
  });
  const pendingOrdersCount = await db.order.count({
    where: { workspaceId, status: 'PENDING' },
  });

  const ordersMonth = await db.order.findMany({
    where: {
      workspaceId,
      createdAt: { gte: firstDayOfMonth },
    },
  });

  const monthSalesTotal = ordersMonth.reduce((acc, o) => acc + o.totalAmount, 0);

  // 2. Expenses & Net Profit Calculation
  const monthExpensesList = await db.expense.findMany({
    where: { workspaceId, expenseDate: { gte: firstDayOfMonth } },
  });
  const { spent: monthExpensesTotal } = calculateNetCashflow([], monthExpensesList);
  const netProfitTotal = monthSalesTotal - monthExpensesTotal;

  // 3. CRM & Inbox Metrics
  const totalContactsCount = await db.contact.count({ where: { workspaceId } });
  const newContactsThisMonth = await db.contact.count({
    where: { workspaceId, createdAt: { gte: firstDayOfMonth } },
  });
  const openConversationsCount = await db.conversation.count({
    where: { workspaceId, status: 'OPEN' },
  });

  // 4. Products & Tasks
  const topProducts = await db.product.findMany({
    where: { workspaceId },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  const tasksList = await db.task.findMany({
    where: { workspaceId, isCompleted: false },
    take: 4,
    orderBy: { dueDate: 'asc' },
  });

  const currency = workspace?.currency || 'SAR';

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            مرحباً بعودتك، {user.fullName} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إليك ملخص أداء الأنشطة، المبيعات والمحادثات لـ{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {workspace?.name}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء طلب جديد</span>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist Widget */}
      <div className="bg-gradient-to-r from-brand-900 to-sky-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>نسبة اكتمال الإعداد: 85%</span>
          </div>
          <h3 className="text-lg font-bold">اكتمال تهيئة النشاط التجاري</h3>
          <p className="text-xs text-slate-300 max-w-xl">
            تم إضافة المنتجات وتفعيل المحاكاة التطويرية للقنوات. اربط مفاتيح WhatsApp أو Instagram من صفحة التكاملات للبدء بالإرسال الحقيقي.
          </p>
        </div>
        <Link
          href="/settings/integrations"
          className="px-5 py-2.5 bg-white text-slate-900 font-extrabold text-xs rounded-xl hover:bg-slate-100 shrink-0 text-center"
        >
          فحص ومتابعة القنوات
        </Link>
      </div>

      {/* Key Executive Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Monthly Sales */}
        <Link
          href="/orders"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>مبيعات هذا الشهر</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {monthSalesTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>إجمالي {ordersMonth.length} طلبات مسجلة</span>
          </div>
        </Link>

        {/* Metric 2: Net Profit */}
        <Link
          href="/expenses"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>صافي الربح التشغيلي</span>
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {netProfitTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            المصاريف: <span className="font-bold text-rose-600">{monthExpensesTotal.toLocaleString()} {currency}</span>
          </div>
        </Link>

        {/* Metric 3: CRM Contacts */}
        <Link
          href="/contacts"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>العملاء في CRM</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalContactsCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">عميل</span>
          </div>
          <div className="text-[11px] text-purple-600 font-bold">
            +{newContactsThisMonth} عملاء جدد هذا الشهر
          </div>
        </Link>

        {/* Metric 4: Open Conversations */}
        <Link
          href="/inbox"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>المحادثات المفتوحة</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {openConversationsCount} <span className="text-xs font-normal text-slate-500">محادثة</span>
          </div>
          <div className="text-[11px] text-sky-600 font-bold">
            متوسط الاستجابة: 1.4 دقيقة
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Top Products & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Products */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              أفضل المنتجات والخدمات
            </h3>
            <Link href="/products" className="text-xs font-bold text-brand-600 hover:underline">
              عرض الكل
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {topProducts.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{p.title}</h4>
                  <span className="text-[11px] text-slate-400">النوع: {p.type} | SKU: {p.sku || 'N/A'}</span>
                </div>
                <div className="text-left font-extrabold text-slate-900 dark:text-white">
                  {p.price} {currency}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks & Follow-ups */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            مهام اليوم والمتابعات
          </h3>

          <div className="space-y-3 text-xs">
            {tasksList.length > 0 ? (
              tasksList.map((t) => (
                <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{t.title}</span>
                    <span className="text-[10px] text-amber-600 font-semibold">الأولوية: {t.priority}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                لا توجد مهام معلقة لهذا اليوم 👍
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
