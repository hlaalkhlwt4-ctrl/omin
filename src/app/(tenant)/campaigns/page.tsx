import { revalidatePath } from 'next/cache';
import { Megaphone, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { EmptyState, PageHeader, StatCard } from '@/components/app/PageHeader';
import { assertWorkspaceLimit } from '@/lib/plan-limits';
import { enqueueJob } from '@/lib/jobs';

async function createCampaign(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'campaigns:manage');
  const title = String(formData.get('title') || '').trim();
  const channel = String(formData.get('channel') || 'EMAIL');
  const templateContent = String(formData.get('templateContent') || '').trim();
  if (title.length < 2 || templateContent.length < 2 || !['EMAIL', 'WHATSAPP'].includes(channel)) return;
  await assertWorkspaceLimit(workspaceId, 'maxCampaigns');
  await db.campaign.create({ data: { workspaceId, title, channel, templateContent, status: 'DRAFT' } });
  revalidatePath('/campaigns');
}

async function scheduleCampaign(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'campaigns:manage');
  const campaignId = String(formData.get('campaignId') || '');
  const scheduledAt = new Date(String(formData.get('scheduledAt') || ''));
  if (!campaignId || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return;
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, workspaceId } });
  if (!campaign || !['DRAFT', 'FAILED', 'SCHEDULED'].includes(campaign.status)) return;
  await db.campaign.update({ where: { id: campaign.id }, data: { status: 'SCHEDULED', scheduledAt } });
  await enqueueJob({
    workspaceId,
    type: 'CAMPAIGN_SEND',
    payload: { campaignId: campaign.id },
    runAt: scheduledAt,
    idempotencyKey: `campaign-send:${campaign.id}`,
  });
  revalidatePath('/campaigns');
}

export default async function CampaignsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'campaigns:manage');
  const campaigns = await db.campaign.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
  const sent = campaigns.reduce((sum, item) => sum + item.sentCount, 0);

  return <div className="space-y-7 pb-12">
    <PageHeader title="الحملات التسويقية" description="أنشئ المسودات وحدد القناة والجمهور. لا يتم أي إرسال خارجي قبل ربط القناة وتأكيد الجدولة." />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="إجمالي الحملات" value={campaigns.length} />
      <StatCard label="المسودات" value={campaigns.filter((item) => item.status === 'DRAFT').length} />
      <StatCard label="رسائل مرسلة فعليًا" value={sent} hint="من سجلات المزود، وليس رقمًا تقديريًا" />
    </div>
    <form action={createCampaign} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
      <div className="md:col-span-2 flex items-center gap-2 font-bold"><Plus className="h-4 w-4" />مسودة حملة جديدة</div>
      <label className="text-xs font-bold">اسم الحملة<input name="title" required minLength={2} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">القناة<select name="channel" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="EMAIL">البريد الإلكتروني</option><option value="WHATSAPP">واتساب الرسمي</option></select></label>
      <label className="text-xs font-bold md:col-span-2">محتوى الرسالة<textarea name="templateContent" required rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <button className="w-fit rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white">حفظ كمسودة</button>
    </form>
    {campaigns.length === 0 ? <EmptyState title="لا توجد حملات بعد" description="أنشئ أول مسودة. ستبقى بدون إرسال حتى تكتمل موافقة المستلمين وربط القناة." /> :
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[760px] text-right text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-4">الحملة</th><th className="p-4">القناة</th><th className="p-4">الحالة</th><th className="p-4">الإرسال</th><th className="p-4">الجدولة</th></tr></thead><tbody>{campaigns.map((item) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4 font-bold">{item.title}</td><td className="p-4">{item.channel}</td><td className="p-4">{item.status}</td><td className="p-4">{item.sentCount} ناجحة / {item.failedCount} فاشلة</td><td className="p-4">{['DRAFT', 'FAILED', 'SCHEDULED'].includes(item.status) ? <form action={scheduleCampaign} className="flex items-center gap-2"><input type="hidden" name="campaignId" value={item.id} /><input name="scheduledAt" type="datetime-local" required className="rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700" /><button className="rounded-lg bg-brand-600 px-3 py-2 font-bold text-white">جدولة</button></form> : item.scheduledAt?.toLocaleString('ar-SA') || '—'}</td></tr>)}</tbody></table></div>}
  </div>;
}
