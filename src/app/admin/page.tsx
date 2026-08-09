import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Activity, BellRing, CreditCard, Layers, LifeBuoy, LogOut, Shield, SlidersHorizontal } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PageHeader, StatCard } from '@/components/app/PageHeader';
import type { Prisma } from '@prisma/client';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-2.5 text-xs dark:border-slate-700';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin) redirect('/dashboard');
  return user;
}

async function audit(actorId: string, action: string, targetType: string, targetId?: string, workspaceId?: string, metadata?: object) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId, workspaceId, metadata: metadata ? JSON.stringify(metadata) : undefined } });
}

async function changeWorkspaceStatus(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || 'ACTIVE');
  if (!id || !['ACTIVE', 'READ_ONLY', 'SUSPENDED'].includes(status)) return;
  await db.workspace.update({ where: { id }, data: { status } });
  await audit(user.id, 'WORKSPACE_STATUS_CHANGED', 'WORKSPACE', id, id, { status });
  revalidatePath('/admin');
}

async function changeUserStatus(formData: FormData) {
  'use server';
  const actor = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || 'ACTIVE');
  if (!id || id === actor.id || !['ACTIVE', 'SUSPENDED'].includes(status)) return;
  await db.$transaction([
    db.user.update({ where: { id }, data: { status } }),
    ...(status === 'SUSPENDED' ? [db.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  await audit(actor.id, 'USER_STATUS_CHANGED', 'USER', id, undefined, { status });
  revalidatePath('/admin');
}

async function saveBranding(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const data = {
    platformName: String(formData.get('platformName') || '').trim(),
    landingHeroTitle: String(formData.get('landingHeroTitle') || '').trim(),
    landingHeroSub: String(formData.get('landingHeroSub') || '').trim(),
    primaryColor: String(formData.get('primaryColor') || '#0284c7'),
    accentColor: String(formData.get('accentColor') || '#10b981'),
    contactEmail: String(formData.get('contactEmail') || '').trim(),
    supportPhone: String(formData.get('supportPhone') || '').trim(),
    maintenanceMode: formData.get('maintenanceMode') === 'on',
  };
  if (!data.platformName || !data.landingHeroTitle) return;
  await db.platformSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
  await audit(user.id, 'PLATFORM_SETTINGS_UPDATED', 'PLATFORM_SETTINGS', 'default');
  revalidatePath('/admin');
  revalidatePath('/');
}

async function savePlan(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const planData = {
    name: String(formData.get('name') || '').trim(),
    nameAr: String(formData.get('nameAr') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    sortingOrder: Number(formData.get('sortingOrder') || 0),
    isActive: formData.get('isActive') === 'on',
  };
  const entitlementData = {
    maxUsers: Math.max(1, Number(formData.get('maxUsers') || 1)),
    maxContacts: Math.max(0, Number(formData.get('maxContacts') || 0)),
    maxMessages: Math.max(0, Number(formData.get('maxMessages') || 0)),
    maxCampaigns: Math.max(0, Number(formData.get('maxCampaigns') || 0)),
    aiTokensLimit: Math.max(0, Number(formData.get('aiTokensLimit') || 0)),
    enableWhitelabel: formData.get('enableWhitelabel') === 'on',
  };
  const monthly = Math.max(0, Number(formData.get('monthly') || 0));
  const yearly = Math.max(0, Number(formData.get('yearly') || 0));
  if (!planData.name || !planData.nameAr || !planData.description) return;

  const planId = await db.$transaction(async (tx) => {
    const plan = id
      ? await tx.plan.update({ where: { id }, data: planData })
      : await tx.plan.create({ data: planData });
    await tx.planEntitlements.upsert({ where: { planId: plan.id }, update: entitlementData, create: { planId: plan.id, ...entitlementData } });
    await tx.planPrice.deleteMany({ where: { planId: plan.id } });
    await tx.planPrice.createMany({ data: [
      { planId: plan.id, interval: 'MONTHLY', price: monthly, currency: 'SAR' },
      { planId: plan.id, interval: 'YEARLY', price: yearly, currency: 'SAR' },
    ] });
    return plan.id;
  });
  await audit(user.id, id ? 'PLAN_UPDATED' : 'PLAN_CREATED', 'PLAN', planId);
  revalidatePath('/admin');
  revalidatePath('/pricing');
}

async function reviewSubscriptionPayment(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const decision = String(formData.get('decision') || '');
  const reviewNote = String(formData.get('reviewNote') || '').trim();
  if (!id || !['APPROVED', 'REJECTED'].includes(decision)) return;
  const payment = await db.subscriptionPayment.findUnique({ where: { id } });
  if (!payment || payment.status !== 'PENDING') return;

  await db.$transaction(async (tx) => {
    await tx.subscriptionPayment.update({ where: { id }, data: { status: decision, reviewNote, reviewedByUserId: user.id, reviewedAt: new Date() } });
    if (decision === 'APPROVED') {
      const now = new Date();
      const periodEnd = new Date(now);
      if (payment.interval === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);
      const current = await tx.subscription.findFirst({ where: { workspaceId: payment.workspaceId }, orderBy: { createdAt: 'desc' } });
      if (current) await tx.subscription.update({ where: { id: current.id }, data: { planId: payment.planId, status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd } });
      else await tx.subscription.create({ data: { workspaceId: payment.workspaceId, planId: payment.planId, status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd } });
    }
  });
  await audit(user.id, `SUBSCRIPTION_PAYMENT_${decision}`, 'SUBSCRIPTION_PAYMENT', id, payment.workspaceId, { reviewNote });
  revalidatePath('/admin');
  revalidatePath('/settings/billing');
}

async function saveFaq(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const data = {
    question: String(formData.get('question') || '').trim(),
    answer: String(formData.get('answer') || '').trim(),
    category: String(formData.get('category') || 'عام').trim(),
    sortingOrder: Number(formData.get('sortingOrder') || 0),
    isPublished: formData.get('isPublished') === 'on',
  };
  if (!data.question || !data.answer) return;
  const faq = id ? await db.faq.update({ where: { id }, data }) : await db.faq.create({ data });
  await audit(user.id, id ? 'FAQ_UPDATED' : 'FAQ_CREATED', 'FAQ', faq.id);
  revalidatePath('/admin');
  revalidatePath('/');
}

async function saveAnnouncement(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const title = String(formData.get('title') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const audience = String(formData.get('audience') || 'ALL');
  const isPublished = formData.get('isPublished') === 'on';
  if (!title || !body || !['ALL', 'ACTIVE', 'TRIALING'].includes(audience)) return;
  const announcement = await db.announcement.create({ data: { title, body, audience, isPublished, publishedAt: isPublished ? new Date() : null } });
  await audit(user.id, 'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT', announcement.id);
  revalidatePath('/admin');
}

async function updateTicket(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || 'OPEN');
  if (!id || !['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) return;
  await db.supportTicket.update({ where: { id }, data: { status } });
  await audit(user.id, 'SUPPORT_TICKET_STATUS_CHANGED', 'SUPPORT_TICKET', id, undefined, { status });
  revalidatePath('/admin');
}

export default async function AdminPage() {
  await requireSuperAdmin();
  const [workspaces, platformUsers, plans, settings, payments, faqs, tickets, announcements, queueDepth, failedJobs, deadLetters, recentAudits, webhookErrors, aiUsage] = await Promise.all([
    db.workspace.findMany({ include: { members: true, subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.user.findMany({ include: { memberships: { select: { workspaceId: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.plan.findMany({ include: { prices: true, entitlements: true }, orderBy: { sortingOrder: 'asc' } }),
    db.platformSettings.findUnique({ where: { id: 'default' } }),
    db.subscriptionPayment.findMany({ include: { workspace: true, plan: true }, orderBy: { submittedAt: 'desc' }, take: 30 }),
    db.faq.findMany({ orderBy: [{ sortingOrder: 'asc' }, { question: 'asc' }] }),
    db.supportTicket.findMany({ orderBy: { updatedAt: 'desc' }, take: 20 }),
    db.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    db.backgroundJob.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    db.backgroundJob.count({ where: { status: 'FAILED' } }),
    db.deadLetterEvent.count(),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    db.webhookEvent.count({ where: { status: 'FAILED' } }),
    db.aiUsageLog.aggregate({ _sum: { inputTokens: true, outputTokens: true, costMicros: true } }),
  ]);

  return <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Link href="/admin" className="flex items-center gap-2 font-extrabold"><span className="rounded-xl bg-amber-500 p-2 text-white"><Shield className="h-5 w-5" /></span>إدارة منصة OmniFlow</Link><div className="flex items-center gap-2"><Link href="/admin/providers" className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white">SMTP وAI</Link><Link href="/dashboard" className="rounded-xl border px-3 py-2 text-xs">العودة للنشاط</Link><form action="/api/auth/logout" method="POST"><button aria-label="تسجيل الخروج" className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><LogOut className="h-4 w-4" /></button></form></div></div></header>
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <PageHeader title="لوحة Super Admin" description="إدارة الأنشطة والباقات والمدفوعات والمحتوى والدعم، مع مؤشرات تشغيل وسجل تدقيق حقيقي." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="الأنشطة" value={workspaces.length} /><StatCard label="المستخدمون" value={platformUsers.length} /><StatCard label="دفعات تنتظر" value={payments.filter((item) => item.status === 'PENDING').length} /><StatCard label="عمق الطابور" value={queueDepth} /><StatCard label="رسائل فاشلة" value={deadLetters} /></div>

      <section className={cardClass}><h2 className="mb-4 flex items-center gap-2 font-bold"><Activity className="h-4 w-4" />مراقبة التشغيل</h2><div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-5"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">مهام فاشلة: <b>{failedJobs}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">Webhook فاشل: <b>{webhookErrors}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">Dead letters: <b>{deadLetters}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">AI tokens: <b>{(aiUsage._sum.inputTokens || 0) + (aiUsage._sum.outputTokens || 0)}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">تكلفة AI: <b>{((aiUsage._sum.costMicros || 0) / 1_000_000).toFixed(3)} USD</b></div></div></section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="p-5"><h2 className="font-bold">الأنشطة والاشتراكات</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-right text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-4">النشاط</th><th className="p-4">الأعضاء</th><th className="p-4">الباقة</th><th className="p-4">الحالة</th><th className="p-4">تحديث</th></tr></thead><tbody>{workspaces.map((workspace) => <tr key={workspace.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4 font-bold">{workspace.name}<span className="block text-[10px] font-normal text-slate-400">{workspace.slug}</span></td><td className="p-4">{workspace.members.length}</td><td className="p-4">{workspace.subscriptions[0]?.plan.nameAr || 'بدون باقة'}</td><td className="p-4">{workspace.status}</td><td className="p-4"><form action={changeWorkspaceStatus} className="flex gap-2"><input type="hidden" name="id" value={workspace.id} /><select name="status" defaultValue={workspace.status} className="rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700"><option value="ACTIVE">ACTIVE</option><option value="READ_ONLY">READ_ONLY</option><option value="SUSPENDED">SUSPENDED</option></select><button className="rounded-lg bg-slate-900 px-3 py-2 text-white dark:bg-white dark:text-slate-900">حفظ</button></form></td></tr>)}</tbody></table></div></section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="p-5"><h2 className="font-bold">المستخدمون</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-4">المستخدم</th><th className="p-4">الأنشطة</th><th className="p-4">البريد</th><th className="p-4">الحالة</th><th className="p-4">إدارة</th></tr></thead><tbody>{platformUsers.map((platformUser) => <tr key={platformUser.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4 font-bold">{platformUser.fullName}{platformUser.isSuperAdmin && <span className="mr-2 rounded bg-amber-100 px-2 py-1 text-[10px] text-amber-700">Super Admin</span>}</td><td className="p-4">{platformUser.memberships.length}</td><td className="p-4">{platformUser.email}</td><td className="p-4">{platformUser.status}</td><td className="p-4"><form action={changeUserStatus} className="flex gap-2"><input type="hidden" name="id" value={platformUser.id} /><select name="status" defaultValue={platformUser.status} disabled={platformUser.isSuperAdmin} className="rounded-lg border bg-transparent p-2"><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select><button disabled={platformUser.isSuperAdmin} className="rounded-lg border px-3 py-2 disabled:opacity-40">حفظ</button></form></td></tr>)}</tbody></table></div></section>

      <section className="space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5" />الباقات والحدود</h2><div className="grid gap-4 lg:grid-cols-2">{plans.map((plan) => <PlanForm key={plan.id} plan={plan} />)}<PlanForm /></div></section>

      <section className={cardClass}><h2 className="mb-4 font-bold">مراجعة دفعات الاشتراك اليدوية</h2>{payments.length === 0 ? <p className="text-xs text-slate-500">لا توجد طلبات دفع.</p> : <div className="space-y-3">{payments.map((payment) => <div key={payment.id} className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800 lg:grid-cols-[1fr_auto]"><div><b>{payment.workspace.name}</b> — {payment.plan.nameAr} — {payment.amount} {payment.currency}<p className="mt-1 text-slate-500">المرجع: {payment.referenceNumber || 'غير مضاف'} · {payment.interval} · الحالة: {payment.status}</p>{payment.proofUrl && <a className="mt-1 inline-block text-brand-600 underline" href={payment.proofUrl} target="_blank" rel="noreferrer">فتح الإثبات</a>}</div>{payment.status === 'PENDING' && <form action={reviewSubscriptionPayment} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={payment.id} /><input name="reviewNote" placeholder="ملاحظة المراجعة" className="rounded-lg border bg-transparent p-2" /><button name="decision" value="APPROVED" className="rounded-lg bg-emerald-600 px-3 py-2 text-white">قبول وتفعيل</button><button name="decision" value="REJECTED" className="rounded-lg bg-rose-600 px-3 py-2 text-white">رفض</button></form>}</div>)}</div>}</section>

      <section className="grid gap-6 lg:grid-cols-2"><form action={saveBranding} className={`${cardClass} space-y-4`}><h2 className="flex items-center gap-2 font-bold"><Layers className="h-4 w-4" />هوية وإعدادات الموقع</h2><label className="block text-xs font-bold">اسم المنصة<input name="platformName" defaultValue={settings?.platformName || 'OmniFlow'} className={fieldClass} /></label><label className="block text-xs font-bold">عنوان الواجهة<input name="landingHeroTitle" defaultValue={settings?.landingHeroTitle} className={fieldClass} /></label><label className="block text-xs font-bold">الوصف<textarea name="landingHeroSub" defaultValue={settings?.landingHeroSub} rows={3} className={fieldClass} /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">بريد الدعم<input type="email" name="contactEmail" defaultValue={settings?.contactEmail} className={fieldClass} /></label><label className="text-xs font-bold">هاتف الدعم<input name="supportPhone" defaultValue={settings?.supportPhone} className={fieldClass} /></label></div><div className="grid grid-cols-2 gap-4"><label className="text-xs font-bold">اللون الرئيسي<input type="color" name="primaryColor" defaultValue={settings?.primaryColor || '#0284c7'} className="mt-2 block h-10 w-full" /></label><label className="text-xs font-bold">لون التمييز<input type="color" name="accentColor" defaultValue={settings?.accentColor || '#10b981'} className="mt-2 block h-10 w-full" /></label></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="maintenanceMode" defaultChecked={settings?.maintenanceMode} />وضع الصيانة</label><button className="rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white">حفظ الإعدادات</button></form>

        <div className={`${cardClass} space-y-4`}><h2 className="flex items-center gap-2 font-bold"><BellRing className="h-4 w-4" />إعلان جديد</h2><form action={saveAnnouncement} className="space-y-3"><input name="title" required placeholder="عنوان الإعلان" className={fieldClass} /><textarea name="body" required rows={3} placeholder="نص الإعلان" className={fieldClass} /><select name="audience" className={fieldClass}><option value="ALL">الجميع</option><option value="ACTIVE">الاشتراكات النشطة</option><option value="TRIALING">الفترة التجريبية</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isPublished" />نشر الآن</label><button className="rounded-xl bg-slate-900 px-4 py-2 text-xs text-white dark:bg-white dark:text-slate-900">حفظ الإعلان</button></form><div className="space-y-2">{announcements.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><b>{item.title}</b><span className="float-left text-slate-500">{item.isPublished ? 'منشور' : 'مسودة'}</span><p className="mt-1 text-slate-500">{item.body}</p></div>)}</div></div></section>

      <section className="grid gap-6 lg:grid-cols-2"><div className={cardClass}><h2 className="mb-4 flex items-center gap-2 font-bold"><LifeBuoy className="h-4 w-4" />الدعم</h2><div className="space-y-3">{tickets.length === 0 ? <p className="text-xs text-slate-500">لا توجد تذاكر دعم.</p> : tickets.map((ticket) => <form action={updateTicket} key={ticket.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800"><input type="hidden" name="id" value={ticket.id} /><div><b>{ticket.subject}</b><p className="text-slate-500">{ticket.category} · {ticket.priority}</p></div><select name="status" defaultValue={ticket.status} className="rounded-lg border bg-transparent p-2" onChange={undefined}><option value="OPEN">مفتوحة</option><option value="IN_PROGRESS">قيد المعالجة</option><option value="RESOLVED">محلولة</option></select><button className="rounded-lg border px-3 py-2">تحديث</button></form>)}</div></div>

        <div className={cardClass}><h2 className="mb-4 flex items-center gap-2 font-bold"><SlidersHorizontal className="h-4 w-4" />سجل التدقيق</h2><div className="max-h-96 space-y-2 overflow-auto">{recentAudits.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-[11px] dark:bg-slate-800"><b>{item.action}</b><span className="float-left text-slate-400">{item.createdAt.toLocaleString('ar-SA')}</span><p className="mt-1 text-slate-500">{item.targetType} {item.targetId || ''} · actor {item.actorId.slice(0, 8)}</p></div>)}</div></div></section>

      <section className={cardClass}><h2 className="mb-4 font-bold">الأسئلة الشائعة CMS</h2><div className="grid gap-4 lg:grid-cols-2">{faqs.map((faq) => <FaqForm key={faq.id} faq={faq} />)}<FaqForm /></div></section>
    </main>
  </div>;
}

type AdminPlan = Prisma.PlanGetPayload<{ include: { prices: true; entitlements: true } }>;

function PlanForm({ plan }: { plan?: AdminPlan }) {
  const monthly = plan?.prices?.find((price) => price.interval === 'MONTHLY')?.price || 0;
  const yearly = plan?.prices?.find((price) => price.interval === 'YEARLY')?.price || 0;
  return <form action={savePlan} className={`${cardClass} grid gap-3 sm:grid-cols-2`}><input type="hidden" name="id" value={plan?.id || ''} /><label className="text-xs font-bold">الاسم العربي<input name="nameAr" required defaultValue={plan?.nameAr} className={fieldClass} /></label><label className="text-xs font-bold">الاسم الإنجليزي<input name="name" required defaultValue={plan?.name} className={fieldClass} /></label><label className="text-xs font-bold sm:col-span-2">الوصف<textarea name="description" required defaultValue={plan?.description} className={fieldClass} /></label><label className="text-xs">شهري SAR<input type="number" min="0" step="0.01" name="monthly" defaultValue={monthly} className={fieldClass} /></label><label className="text-xs">سنوي SAR<input type="number" min="0" step="0.01" name="yearly" defaultValue={yearly} className={fieldClass} /></label><label className="text-xs">المستخدمون<input type="number" min="1" name="maxUsers" defaultValue={plan?.entitlements?.maxUsers || 1} className={fieldClass} /></label><label className="text-xs">العملاء<input type="number" min="0" name="maxContacts" defaultValue={plan?.entitlements?.maxContacts || 0} className={fieldClass} /></label><label className="text-xs">الرسائل<input type="number" min="0" name="maxMessages" defaultValue={plan?.entitlements?.maxMessages || 0} className={fieldClass} /></label><label className="text-xs">الحملات<input type="number" min="0" name="maxCampaigns" defaultValue={plan?.entitlements?.maxCampaigns || 0} className={fieldClass} /></label><label className="text-xs">AI tokens<input type="number" min="0" name="aiTokensLimit" defaultValue={plan?.entitlements?.aiTokensLimit || 0} className={fieldClass} /></label><label className="text-xs">الترتيب<input type="number" name="sortingOrder" defaultValue={plan?.sortingOrder || 0} className={fieldClass} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} />نشطة</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="enableWhitelabel" defaultChecked={plan?.entitlements?.enableWhitelabel} />White-label</label><button className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white sm:col-span-2">{plan ? 'حفظ الباقة' : 'إنشاء باقة'}</button></form>;
}

type AdminFaq = { id: string; question: string; answer: string; category: string; sortingOrder: number; isPublished: boolean };

function FaqForm({ faq }: { faq?: AdminFaq }) {
  return <form action={saveFaq} className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800"><input type="hidden" name="id" value={faq?.id || ''} /><input name="question" required placeholder="السؤال" defaultValue={faq?.question} className={fieldClass} /><textarea name="answer" required placeholder="الإجابة" defaultValue={faq?.answer} rows={3} className={fieldClass} /><div className="grid grid-cols-2 gap-2"><input name="category" placeholder="التصنيف" defaultValue={faq?.category || 'عام'} className={fieldClass} /><input type="number" name="sortingOrder" defaultValue={faq?.sortingOrder || 0} className={fieldClass} /></div><label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={faq?.isPublished ?? true} />منشور</label><button className="rounded-lg border px-3 py-2 font-bold">{faq ? 'تحديث' : 'إضافة'}</button></form>;
}
