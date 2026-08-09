import { revalidatePath } from 'next/cache';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { EmptyState, PageHeader, StatCard } from '@/components/app/PageHeader';

async function createTask(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'tasks:manage');
  const title = String(formData.get('title') || '').trim();
  const assignedUserId = String(formData.get('assignedUserId') || '');
  const contactId = String(formData.get('contactId') || '');
  const dueDateValue = String(formData.get('dueDate') || '');
  const priority = String(formData.get('priority') || 'MEDIUM');
  if (title.length < 2 || !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) return;
  if (assignedUserId) {
    const member = await db.workspaceMember.findFirst({ where: { workspaceId, userId: assignedUserId, status: 'ACTIVE' } });
    if (!member) return;
  }
  if (contactId) {
    const contact = await db.contact.findFirst({ where: { workspaceId, id: contactId } });
    if (!contact) return;
  }
  await db.task.create({ data: { workspaceId, title, priority, assignedUserId: assignedUserId || null, contactId: contactId || null, dueDate: dueDateValue ? new Date(dueDateValue) : null } });
  revalidatePath('/tasks'); revalidatePath('/dashboard');
}

async function toggleTask(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'tasks:manage');
  const id = String(formData.get('id') || '');
  const task = await db.task.findFirst({ where: { id, workspaceId } });
  if (!task) return;
  await db.task.update({ where: { id }, data: { isCompleted: !task.isCompleted } });
  revalidatePath('/tasks'); revalidatePath('/dashboard');
}

export default async function TasksPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'tasks:view');
  const [tasks, members, contacts] = await Promise.all([
    db.task.findMany({ where: { workspaceId }, include: { assignedUser: true, contact: true }, orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }] }),
    db.workspaceMember.findMany({ where: { workspaceId, status: 'ACTIVE' }, include: { user: true } }),
    db.contact.findMany({ where: { workspaceId }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' }, take: 500 }),
  ]);
  const canManage = ['OWNER', 'ADMIN', 'SALES', 'SUPPORT'].includes(role);
  return <div className="space-y-7 pb-12">
    <PageHeader title="المهام والمتابعات" description="مهام الفريق مرتبطة بالنشاط، ويمكن ربطها بعميل وموعد ومسؤول." />
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="مفتوحة" value={tasks.filter((task) => !task.isCompleted).length} /><StatCard label="مكتملة" value={tasks.filter((task) => task.isCompleted).length} /><StatCard label="عالية الأولوية" value={tasks.filter((task) => !task.isCompleted && task.priority === 'HIGH').length} /></div>
    {canManage && <form action={createTask} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2 lg:grid-cols-5"><label className="font-bold lg:col-span-2">المهمة<input name="title" required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label><label className="font-bold">المسؤول<select name="assignedUserId" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="">غير معين</option>{members.map((member) => <option key={member.id} value={member.userId}>{member.user.fullName}</option>)}</select></label><label className="font-bold">العميل<select name="contactId" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="">بدون عميل</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}</select></label><label className="font-bold">الأولوية<select name="priority" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="LOW">منخفضة</option><option value="MEDIUM">متوسطة</option><option value="HIGH">عالية</option></select></label><label className="font-bold">الموعد<input type="datetime-local" name="dueDate" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label><button className="flex w-fit items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-bold text-white"><Plus className="h-4 w-4" />إضافة المهمة</button></form>}
    {tasks.length === 0 ? <EmptyState title="لا توجد مهام" description="أضف متابعة مرتبطة بعميل أو عضو فريق لتظهر هنا وفي لوحة الأداء." /> : <div className="space-y-3">{tasks.map((task) => <div key={task.id} className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${task.isCompleted ? 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}><div className="flex gap-3">{task.isCompleted ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 text-slate-400" />}<div><h2 className={`text-sm font-bold ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</h2><p className="mt-1 text-[11px] text-slate-500">{task.assignedUser?.fullName || 'غير معين'}{task.contact ? ` — ${task.contact.fullName}` : ''}{task.dueDate ? ` — ${task.dueDate.toLocaleString('ar-SA')}` : ''}</p></div></div>{canManage && <form action={toggleTask}><input type="hidden" name="id" value={task.id} /><button className="rounded-lg border border-slate-300 px-3 py-2 text-[11px] font-bold dark:border-slate-700">{task.isCompleted ? 'إعادة فتح' : 'إكمال'}</button></form>}</div>)}</div>}
  </div>;
}
