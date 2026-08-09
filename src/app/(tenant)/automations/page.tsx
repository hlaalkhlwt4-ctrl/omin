import { revalidatePath } from 'next/cache';
import { Workflow } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { EmptyState, PageHeader, StatCard } from '@/components/app/PageHeader';

async function createAutomation(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'automations:manage');
  const title = String(formData.get('title') || '').trim();
  const triggerEvent = String(formData.get('triggerEvent') || 'CONTACT_CREATED');
  const stepType = String(formData.get('stepType') || 'ADD_TAG');
  if (title.length < 2) return;
  await db.automation.create({ data: { workspaceId, title, triggerEvent, isActive: false, steps: { create: { stepType, stepConfig: '{}', sortingOrder: 1 } } } });
  revalidatePath('/automations');
}

export default async function AutomationsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'automations:manage');
  const automations = await db.automation.findMany({ where: { workspaceId }, include: { steps: true }, orderBy: { createdAt: 'desc' } });
  return <div className="space-y-7 pb-12">
    <PageHeader title="محرك الأتمتة" description="عرّف المشغّل والخطوة الأولى. الأتمتة الجديدة تُحفظ متوقفة حتى تراجع إعداداتها، فلا تنفذ إجراءً غير مقصود." />
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="إجمالي الأتمتات" value={automations.length} /><StatCard label="نشطة" value={automations.filter((item) => item.isActive).length} /><StatCard label="بحاجة للمراجعة" value={automations.filter((item) => !item.isActive).length} /></div>
    <form action={createAutomation} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
      <label className="text-xs font-bold">اسم الأتمتة<input name="title" required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">المشغّل<select name="triggerEvent" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="CONTACT_CREATED">إنشاء عميل</option><option value="NEW_MESSAGE">رسالة جديدة</option><option value="ORDER_STATUS_CHANGED">تغيير حالة طلب</option><option value="PAYMENT_CONFIRMED">تأكيد دفعة</option></select></label>
      <label className="text-xs font-bold">الخطوة الأولى<select name="stepType" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="ADD_TAG">إضافة وسم</option><option value="ASSIGN_USER">تعيين موظف</option><option value="SEND_MESSAGE">إرسال رسالة</option><option value="AI_REPLY">اقتراح رد ذكي</option></select></label>
      <button className="w-fit rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white"><Workflow className="ms-1 inline h-4 w-4" />حفظ متوقفة</button>
    </form>
    {automations.length === 0 ? <EmptyState title="لا توجد أتمتات" description="أنشئ أول تدفق متوقف، ثم راجع إعداداته قبل التفعيل." /> : <div className="grid gap-4 md:grid-cols-2">{automations.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-bold">{item.title}</h2><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.isActive ? 'نشطة' : 'متوقفة للمراجعة'}</span></div><p className="mt-3 text-xs text-slate-500">{item.triggerEvent} ← {item.steps.map((step) => step.stepType).join('، ')}</p></div>)}</div>}
  </div>;
}
