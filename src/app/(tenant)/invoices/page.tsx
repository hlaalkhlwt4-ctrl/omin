import React from 'react';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { FileText, Download, Plus } from 'lucide-react';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';

async function recordPayment(formData: FormData) {
  'use server';
  const { workspaceId, user, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'finance:manage');
  const orderId = String(formData.get('orderId') || '');
  const amount = Number(formData.get('amount'));
  const method = String(formData.get('method') || 'BANK_TRANSFER');
  const notes = String(formData.get('notes') || '').trim();
  if (!orderId || !Number.isFinite(amount) || amount <= 0 || !['BANK_TRANSFER', 'CASH', 'CARD', 'ONLINE'].includes(method)) return;

  await db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, workspaceId }, include: { invoices: true } });
    if (!order) throw new Error('ORDER_NOT_FOUND');
    const confirmed = await tx.payment.aggregate({ where: { orderId, workspaceId, status: 'CONFIRMED' }, _sum: { amount: true } });
    const paidBefore = confirmed._sum.amount || 0;
    const balance = Math.max(0, order.totalAmount - paidBefore);
    if (amount > balance + 0.001) throw new Error('PAYMENT_EXCEEDS_BALANCE');
    const paidAmount = Math.round((paidBefore + amount) * 100) / 100;
    await tx.payment.create({ data: { workspaceId, orderId, amount, method, status: 'CONFIRMED', notes: notes || null } });
    await tx.order.update({ where: { id: order.id }, data: { paidAmount, status: paidAmount >= order.totalAmount ? 'PAID' : order.status } });
    const invoice = order.invoices[0];
    if (invoice) {
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: paidAmount >= order.totalAmount ? 'PAID' : 'ISSUED' } });
    } else {
      const invoiceCount = await tx.invoice.count({ where: { workspaceId } });
      await tx.invoice.create({ data: { workspaceId, orderId, invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, '0')}`, totalAmount: order.totalAmount, status: paidAmount >= order.totalAmount ? 'PAID' : 'ISSUED' } });
    }
    await tx.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'PAYMENT_CONFIRMED', targetType: 'ORDER', targetId: order.id, metadata: JSON.stringify({ amount, method }) } });
  });
  revalidatePath('/invoices'); revalidatePath('/orders'); revalidatePath('/dashboard');
}

export default async function InvoicesPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'finance:view');

  const invoices = await db.invoice.findMany({
    where: { workspaceId },
    include: {
      order: { include: { contact: true } },
    },
    orderBy: { issueDate: 'desc' },
  });

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  const unpaidOrders = await db.order.findMany({ where: { workspaceId, status: { notIn: ['CANCELED', 'COMPLETED'] } }, include: { contact: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  const currency = workspace?.currency || 'SAR';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            <span>الفواتير والمدفوعات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            عرض وتصدير الفواتير الضريبية المسلسلة بصيغة PDF باللغة العربية.
          </p>
        </div>
      </div>

      {unpaidOrders.some((order) => order.paidAmount < order.totalAmount) && (
        <form action={recordPayment} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
          <h2 className="flex items-center gap-2 font-bold md:col-span-4"><Plus className="h-4 w-4" />تسجيل دفعة مؤكدة</h2>
          <label className="font-bold">الطلب<select name="orderId" required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="">اختر طلبًا...</option>{unpaidOrders.filter((order) => order.paidAmount < order.totalAmount).map((order) => <option key={order.id} value={order.id}>{order.contact.fullName} — المتبقي {(order.totalAmount - order.paidAmount).toFixed(2)} {currency}</option>)}</select></label>
          <label className="font-bold">المبلغ<input name="amount" type="number" min="0.01" step="0.01" required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
          <label className="font-bold">الطريقة<select name="method" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="BANK_TRANSFER">تحويل بنكي</option><option value="CASH">نقدي</option><option value="CARD">بطاقة</option><option value="ONLINE">دفع إلكتروني</option></select></label>
          <label className="font-bold">ملاحظات<input name="notes" maxLength={500} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
          <button className="w-fit rounded-xl bg-brand-600 px-5 py-3 font-bold text-white">تأكيد الدفعة وإصدار الفاتورة</button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm text-xs">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800 text-slate-500">
            <tr>
              <th className="p-4">رقم الفاتورة</th>
              <th className="p-4">العميل</th>
              <th className="p-4">تاريخ الإصدار</th>
              <th className="p-4">المبلغ والإجمالي</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-left">التصدير</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.length > 0 ? (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                  <td className="p-4">{inv.order?.contact?.fullName}</td>
                  <td className="p-4 text-slate-500">{new Date(inv.issueDate).toLocaleDateString('ar-SA')}</td>
                  <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                    {inv.totalAmount} {currency}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-left">
                    <a
                      href={`/api/invoices/download?id=${inv.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل PDF</span>
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  لا توجد فواتير صادرة بعد. يتم إصدار الفواتير تلقائياً عند تأكيد الطلبات.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
