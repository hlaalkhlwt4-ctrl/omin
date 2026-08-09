import { revalidatePath } from 'next/cache';
import { LifeBuoy } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { PageHeader } from '@/components/app/PageHeader';

async function createTicket(formData: FormData) {
  'use server';
  const { user, workspaceId } = await requireWritableWorkspaceContext();
  const subject = String(formData.get('subject') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const category = String(formData.get('category') || 'TECHNICAL');
  const priority = String(formData.get('priority') || 'NORMAL');
  if (!subject || !body || !['TECHNICAL', 'BILLING', 'ACCOUNT', 'OTHER'].includes(category) || !['LOW', 'NORMAL', 'HIGH'].includes(priority)) return;
  await db.supportTicket.create({ data: { workspaceId, userId: user.id, subject, category, priority, messages: { create: { senderUserId: user.id, body } } } });
  revalidatePath('/settings/support');
  revalidatePath('/admin');
}

async function addReply(formData: FormData) {
  'use server';
  const { user, workspaceId } = await requireWritableWorkspaceContext();
  const ticketId = String(formData.get('ticketId') || '');
  const body = String(formData.get('body') || '').trim();
  if (!ticketId || !body) return;
  const ticket = await db.supportTicket.findFirst({ where: { id: ticketId, workspaceId } });
  if (!ticket || ticket.status === 'RESOLVED') return;
  await db.$transaction([
    db.supportMessage.create({ data: { ticketId, senderUserId: user.id, body } }),
    db.supportTicket.update({ where: { id: ticketId }, data: { status: 'OPEN' } }),
  ]);
  revalidatePath('/settings/support');
  revalidatePath('/admin');
}

export default async function SupportPage() {
  const { workspaceId } = await requireWorkspaceContext();
  const tickets = await db.supportTicket.findMany({ where: { workspaceId }, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' }, take: 30 });
  return <div className="space-y-7 pb-12">
    <PageHeader title="الدعم الفني" description="أرسل تذكرة وتابع الردود وحالة المعالجة من داخل المنصة." />
    <form action={createTicket} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2"><h2 className="flex items-center gap-2 font-bold md:col-span-2"><LifeBuoy className="h-4 w-4" />تذكرة جديدة</h2><input name="subject" required placeholder="عنوان المشكلة" className="rounded-xl border bg-transparent p-3 text-xs md:col-span-2" /><select name="category" className="rounded-xl border bg-transparent p-3 text-xs"><option value="TECHNICAL">تقني</option><option value="BILLING">فوترة</option><option value="ACCOUNT">حساب</option><option value="OTHER">أخرى</option></select><select name="priority" className="rounded-xl border bg-transparent p-3 text-xs"><option value="NORMAL">عادية</option><option value="LOW">منخفضة</option><option value="HIGH">عالية</option></select><textarea name="body" required rows={4} placeholder="اشرح المشكلة بالتفصيل" className="rounded-xl border bg-transparent p-3 text-xs md:col-span-2" /><button className="rounded-xl bg-brand-600 px-4 py-3 text-xs font-bold text-white md:col-span-2">إرسال التذكرة</button></form>
    <section className="space-y-4">{tickets.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">لا توجد تذاكر سابقة.</div> : tickets.map((ticket) => <article key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{ticket.subject}</h2><p className="mt-1 text-xs text-slate-500">{ticket.category} · {ticket.priority}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold dark:bg-slate-800">{ticket.status}</span></div><div className="mt-4 space-y-2">{ticket.messages.filter((message) => !message.isInternal).map((message) => <div key={message.id} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800"><p>{message.body}</p><span className="mt-1 block text-[10px] text-slate-400">{message.createdAt.toLocaleString('ar-SA')}</span></div>)}</div>{ticket.status !== 'RESOLVED' && <form action={addReply} className="mt-3 flex gap-2"><input type="hidden" name="ticketId" value={ticket.id} /><input name="body" required placeholder="إضافة رد" className="min-w-0 flex-1 rounded-xl border bg-transparent p-2.5 text-xs" /><button className="rounded-xl border px-4 py-2 text-xs font-bold">إرسال</button></form>}</article>)}</section>
  </div>;
}
