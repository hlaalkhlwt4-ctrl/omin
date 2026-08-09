import { revalidatePath } from 'next/cache';
import { Clock3, CheckCircle2, XCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader } from '@/components/app/PageHeader';

async function submitManualPayment(formData: FormData) {
  'use server';
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const planId = String(formData.get('planId') || '');
  const interval = String(formData.get('interval') || 'MONTHLY');
  const referenceNumber = String(formData.get('referenceNumber') || '').trim();
  const proofUrl = String(formData.get('proofUrl') || '').trim();
  const note = String(formData.get('note') || '').trim();
  if (!planId || !['MONTHLY', 'YEARLY'].includes(interval) || !referenceNumber) return;
  const price = await db.planPrice.findFirst({ where: { planId, interval, plan: { isActive: true } } });
  if (!price) return;
  const pending = await db.subscriptionPayment.findFirst({ where: { workspaceId, status: 'PENDING' } });
  if (pending) return;
  await db.subscriptionPayment.create({ data: { workspaceId, planId, submittedByUserId: user.id, amount: price.price, currency: price.currency, interval, referenceNumber, proofUrl: proofUrl || null, note: note || null } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'SUBSCRIPTION_PAYMENT_SUBMITTED', targetType: 'SUBSCRIPTION_PAYMENT', metadata: JSON.stringify({ planId, interval }) } });
  revalidatePath('/settings/billing');
  revalidatePath('/admin');
}

export default async function BillingSettingsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const [workspace, plans, requests] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 } } }),
    db.plan.findMany({ where: { isActive: true }, include: { prices: true }, orderBy: { sortingOrder: 'asc' } }),
    db.subscriptionPayment.findMany({ where: { workspaceId }, include: { plan: true }, orderBy: { submittedAt: 'desc' }, take: 20 }),
  ]);
  const current = workspace?.subscriptions[0];
  const hasPending = requests.some((item) => item.status === 'PENDING');

  return <div className="space-y-7 pb-12">
    <PageHeader title="الاشتراك والفوترة" description="اختر الباقة وأرسل مرجع التحويل. لا يتم تفعيل الاشتراك إلا بعد مراجعة مدير المنصة وقبوله." />
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-bold">الاشتراك الحالي</h2>{current ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><div><b>{current.plan.nameAr}</b><p className="mt-1 text-xs">الحالة: {current.status}</p></div><span>حتى {current.currentPeriodEnd.toLocaleDateString('ar-SA')}</span></div> : <p className="mt-3 text-xs text-slate-500">لا يوجد اشتراك مفعل حتى الآن.</p>}</section>
    <section className="grid gap-4 lg:grid-cols-3">{plans.map((plan) => <form action={submitManualPayment} key={plan.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><input type="hidden" name="planId" value={plan.id} /><h2 className="font-bold">{plan.nameAr}</h2><p className="min-h-12 text-xs leading-5 text-slate-500">{plan.description}</p><select name="interval" className="w-full rounded-xl border bg-transparent p-2 text-xs">{plan.prices.map((price) => <option key={price.id} value={price.interval}>{price.interval === 'MONTHLY' ? 'شهري' : 'سنوي'} — {price.price} {price.currency}</option>)}</select><input name="referenceNumber" required placeholder="رقم مرجع التحويل" className="w-full rounded-xl border bg-transparent p-2.5 text-xs" /><input type="url" name="proofUrl" placeholder="رابط إثبات التحويل (اختياري)" className="w-full rounded-xl border bg-transparent p-2.5 text-xs" /><textarea name="note" placeholder="ملاحظة (اختياري)" className="w-full rounded-xl border bg-transparent p-2.5 text-xs" /><button disabled={hasPending} className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{hasPending ? 'يوجد طلب قيد المراجعة' : 'إرسال طلب المراجعة'}</button></form>)}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-bold">سجل الطلبات</h2><div className="space-y-3">{requests.length === 0 ? <p className="text-xs text-slate-500">لم ترسل أي طلب بعد.</p> : requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800"><div className="flex items-center gap-2">{request.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : request.status === 'REJECTED' ? <XCircle className="h-4 w-4 text-rose-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}<div><b>{request.plan.nameAr}</b><p className="text-slate-500">{request.amount} {request.currency} · {request.referenceNumber}</p></div></div><div className="text-left"><b>{request.status}</b><p className="text-slate-500">{request.submittedAt.toLocaleDateString('ar-SA')}</p></div>{request.reviewNote && <p className="w-full rounded-lg bg-white p-2 text-slate-600 dark:bg-slate-900">ملاحظة المراجعة: {request.reviewNote}</p>}</div>)}</div></section>
  </div>;
}
