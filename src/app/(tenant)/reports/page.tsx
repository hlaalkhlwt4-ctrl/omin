import { db } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader, StatCard } from '@/components/app/PageHeader';
import { calculateNetCashflow } from '@/lib/finance';

export default async function ReportsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'finance:view');
  const [workspace, orders, payments, expenses, contacts] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId } }),
    db.order.findMany({ where: { workspaceId }, select: { totalAmount: true, paidAmount: true, status: true, createdAt: true } }),
    db.payment.findMany({ where: { workspaceId, status: 'CONFIRMED' }, select: { amount: true, createdAt: true } }),
    db.expense.findMany({ where: { workspaceId }, select: { amount: true, expenseDate: true, category: true } }),
    db.contact.count({ where: { workspaceId } }),
  ]);
  const currency = workspace?.currency || 'SAR';
  const sales = orders.reduce((sum, item) => sum + item.totalAmount, 0);
  const { collected, spent } = calculateNetCashflow(payments, expenses);
  const formatter = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 });
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return { key, label: date.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' }), revenue: 0, expenses: 0 };
  });
  for (const payment of payments) { const key = `${payment.createdAt.getFullYear()}-${payment.createdAt.getMonth()}`; const row = months.find((item) => item.key === key); if (row) row.revenue += payment.amount; }
  for (const expense of expenses) { const key = `${expense.expenseDate.getFullYear()}-${expense.expenseDate.getMonth()}`; const row = months.find((item) => item.key === key); if (row) row.expenses += expense.amount; }

  return <div className="space-y-7 pb-12">
    <PageHeader title="التقارير التحليلية" description="جميع القيم محسوبة من الطلبات والمدفوعات والمصاريف المسجلة لهذا النشاط فقط." />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="قيمة الطلبات" value={`${formatter.format(sales)} ${currency}`} />
      <StatCard label="المبالغ المحصلة" value={`${formatter.format(collected)} ${currency}`} />
      <StatCard label="المصاريف" value={`${formatter.format(spent)} ${currency}`} />
      <StatCard label="صافي التدفق" value={`${formatter.format(collected - spent)} ${currency}`} />
      <StatCard label="العملاء" value={contacts} />
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-bold">التدفق النقدي لآخر 6 أشهر</h2>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-right text-xs"><thead className="text-slate-500"><tr><th className="p-3">الشهر</th><th className="p-3">المحصل</th><th className="p-3">المصاريف</th><th className="p-3">الصافي</th></tr></thead><tbody>{months.map((month) => <tr key={month.key} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{month.label}</td><td className="p-3 text-emerald-600">{formatter.format(month.revenue)} {currency}</td><td className="p-3 text-rose-600">{formatter.format(month.expenses)} {currency}</td><td className="p-3 font-bold">{formatter.format(month.revenue - month.expenses)} {currency}</td></tr>)}</tbody></table></div>
    </div>
  </div>;
}
