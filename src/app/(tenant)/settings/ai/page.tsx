import { revalidatePath } from 'next/cache';
import { Bot, BookOpen } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader } from '@/components/app/PageHeader';
import { getDefaultAiModelSettings } from '@/lib/platform-providers';

async function saveAgent(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'inbox:manage_ai');
  const name = String(formData.get('name') || '').trim();
  const roleText = String(formData.get('role') || '').trim();
  const tone = String(formData.get('tone') || '').trim();
  const businessInfo = String(formData.get('businessInfo') || '').trim();
  const mode = String(formData.get('mode') || 'SUGGEST');
  if (!name || !roleText || !['OFF', 'SUGGEST', 'AUTO_REPLY'].includes(mode)) return;
  await db.aiAgent.upsert({ where: { workspaceId }, update: { name, role: roleText, tone, businessInfo, mode, isEnabled: mode !== 'OFF' }, create: { workspaceId, name, role: roleText, tone, businessInfo, mode, isEnabled: mode !== 'OFF' } });
  revalidatePath('/settings/ai');
}

async function addKnowledge(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'inbox:manage_ai');
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  if (title.length < 2 || content.length < 10) return;
  const agent = await db.aiAgent.findUnique({ where: { workspaceId } });
  if (!agent) return;
  await db.aiKnowledgeChunk.create({ data: { agentId: agent.id, title, content } });
  revalidatePath('/settings/ai');
}

export default async function AiSettingsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'inbox:manage_ai');
  const [agent, platformModel] = await Promise.all([
    db.aiAgent.findUnique({ where: { workspaceId }, include: { chunks: true } }),
    getDefaultAiModelSettings(),
  ]);
  const externalConnected = Boolean(platformModel);
  return <div className="space-y-7 pb-12">
    <PageHeader title="مساعد الذكاء الاصطناعي" description="اضبط شخصية المساعد وبنك المعرفة. وضع الاقتراح آمن افتراضيًا؛ الرد التلقائي يحتاج مزودًا متصلًا ومراجعة سياساتك." />
    <div className={`rounded-2xl border p-4 text-xs ${externalConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{externalConnected ? `النموذج المركزي: ${platformModel?.displayName} (${platformModel?.modelId}).` : 'مزود خارجي غير متصل. ستعمل الاقتراحات المحلية المبنية على بنك المعرفة فقط.'}</div>
    <form action={saveAgent} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
      <h2 className="flex items-center gap-2 font-bold md:col-span-2"><Bot className="h-5 w-5" />إعدادات الشخصية</h2>
      <label className="text-xs font-bold">اسم المساعد<input name="name" defaultValue={agent?.name} required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">الدور<input name="role" defaultValue={agent?.role} required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">النبرة<input name="tone" defaultValue={agent?.tone} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">الوضع<select name="mode" defaultValue={agent?.mode || 'SUGGEST'} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="OFF">متوقف</option><option value="SUGGEST">اقتراح فقط</option><option value="AUTO_REPLY" disabled={!externalConnected}>رد تلقائي (يتطلب اتصالًا)</option></select></label>
      <label className="text-xs font-bold md:col-span-2">نبذة النشاط<textarea name="businessInfo" defaultValue={agent?.businessInfo || ''} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <button className="w-fit rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white">حفظ الإعدادات</button>
    </form>
    <form action={addKnowledge} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="flex items-center gap-2 font-bold"><BookOpen className="h-5 w-5" />إضافة معرفة موثقة</h2>
      <input name="title" required placeholder="مثال: سياسة الاسترجاع" className="rounded-xl border border-slate-300 bg-transparent p-3 text-xs dark:border-slate-700" />
      <textarea name="content" required minLength={10} rows={4} placeholder="اكتب النص الذي يجب أن يعتمد عليه المساعد..." className="rounded-xl border border-slate-300 bg-transparent p-3 text-xs dark:border-slate-700" />
      <button disabled={!agent} className="w-fit rounded-xl border border-brand-600 px-5 py-3 text-xs font-bold text-brand-700 disabled:opacity-50">إضافة إلى البنك</button>
      <div className="grid gap-3 md:grid-cols-2">{agent?.chunks.map((chunk) => <div key={chunk.id} className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800"><strong>{chunk.title}</strong><p className="mt-2 line-clamp-3 text-slate-500">{chunk.content}</p></div>)}</div>
    </form>
  </div>;
}
