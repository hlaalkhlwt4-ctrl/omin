import { revalidatePath } from 'next/cache';
import { Building2 } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader } from '@/components/app/PageHeader';
import { CurrencySelect } from '@/components/app/CurrencySelect';
import { isSupportedCurrency } from '@/lib/currencies';

async function saveBusinessSettings(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const name = String(formData.get('name') || '').trim();
  const taxNumber = String(formData.get('taxNumber') || '').replace(/\s/g, '');
  const businessAddress = String(formData.get('businessAddress') || '').trim();
  const taxRate = Number(formData.get('taxRate'));
  const currency = String(formData.get('currency') || '').toUpperCase();
  if (name.length < 2 || (taxNumber && !/^\d{15}$/.test(taxNumber)) || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 || !isSupportedCurrency(currency)) return;
  await db.workspace.update({ where: { id: workspaceId }, data: { name, taxNumber: taxNumber || null, businessAddress: businessAddress || null, taxRate, currency } });
  revalidatePath('/settings/business');
  revalidatePath('/dashboard');
  revalidatePath('/products');
  revalidatePath('/orders');
  revalidatePath('/expenses');
  revalidatePath('/reports');
  revalidatePath('/invoices');
}

export default async function BusinessSettingsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  return <div className="space-y-7 pb-12">
    <PageHeader title="بيانات المنشأة والفوترة" description="تظهر هذه البيانات في الفاتورة العربية وQR الضريبي. راجعها قبل إصدار مستندات حقيقية." />
    <form action={saveBusinessSettings} className="grid max-w-3xl gap-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
      <h2 className="flex items-center gap-2 font-bold md:col-span-2"><Building2 className="h-5 w-5" /> الهوية القانونية</h2>
      <label className="text-xs font-bold">اسم المنشأة<input name="name" required defaultValue={workspace.name} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">الرقم الضريبي (15 رقمًا)<input name="taxNumber" inputMode="numeric" pattern="[0-9]{15}" defaultValue={workspace.taxNumber || ''} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold md:col-span-2">عنوان المنشأة<textarea name="businessAddress" rows={3} defaultValue={workspace.businessAddress || ''} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">العملة الأساسية<CurrencySelect defaultValue={workspace.currency} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">نسبة الضريبة %<input name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue={workspace.taxRate} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800 md:col-span-2">تغيير العملة يغيّر رمز عرض المبالغ ولا يحوّل القيم السابقة تلقائيًا بسعر صرف.</p>
      <button className="mt-auto w-fit rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white">حفظ بيانات الفوترة</button>
    </form>
  </div>;
}
