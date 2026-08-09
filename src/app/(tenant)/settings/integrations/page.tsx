import { revalidatePath } from 'next/cache';
import { Cable, CheckCircle2, CircleOff } from 'lucide-react';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader } from '@/components/app/PageHeader';
import { decryptIntegrationConfig, encryptIntegrationConfig, maskSecret } from '@/lib/integration-secrets';
import nodemailer from 'nodemailer';

const providers = [
  { id: 'WHATSAPP', name: 'WhatsApp Cloud API', note: 'يتطلب Meta App ورقم أعمال معتمدًا وWebhook.' },
  { id: 'INSTAGRAM', name: 'Instagram Professional', note: 'يتطلب حسابًا احترافيًا مرتبطًا بصفحة Facebook.' },
  { id: 'FACEBOOK', name: 'Facebook Messenger', note: 'يتطلب Page Access Token ومراجعة صلاحيات التطبيق.' },
  { id: 'EMAIL', name: 'Gmail / Outlook', note: 'يتطلب OAuth وموافقة المستخدم على صلاحيات البريد.' },
  { id: 'DEV_MOCK', name: 'Development Mock', note: 'محاكي محلي معزول لا يرسل لأي مستلم حقيقي.' },
] as const;

async function addChannel(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const provider = String(formData.get('provider') || '');
  const definition = providers.find((item) => item.id === provider);
  if (!definition) return;
  const existing = await db.channel.findFirst({ where: { workspaceId, provider } });
  if (!existing) await db.channel.create({ data: { workspaceId, provider, name: definition.name, isActive: provider === 'DEV_MOCK', healthStatus: provider === 'DEV_MOCK' ? 'CONNECTED' : 'DISCONNECTED' } });
  revalidatePath('/settings/integrations');
}

async function saveChannelConfiguration(formData: FormData) {
  'use server';
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channelId = String(formData.get('channelId') || '');
  const channel = await db.channel.findFirst({ where: { id: channelId, workspaceId } });
  if (!channel || channel.provider === 'DEV_MOCK') return;
  const existing = decryptIntegrationConfig(channel.settingsJson);
  const allowed = channel.provider === 'EMAIL'
    ? ['host', 'port', 'user', 'pass', 'from', 'defaultSubject']
    : channel.provider === 'WHATSAPP'
      ? ['accessToken', 'phoneId']
      : ['accessToken'];
  for (const key of allowed) {
    const value = String(formData.get(key) || '').trim();
    if (value) existing[key] = key === 'port' ? Number(value) : value;
  }
  await db.channel.update({ where: { id: channel.id }, data: { settingsJson: encryptIntegrationConfig(existing), healthStatus: 'DISCONNECTED', isActive: true } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'CHANNEL_CREDENTIALS_UPDATED', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ provider: channel.provider }) } });
  revalidatePath('/settings/integrations');
}

async function testChannelConnection(formData: FormData) {
  'use server';
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channelId = String(formData.get('channelId') || '');
  const channel = await db.channel.findFirst({ where: { id: channelId, workspaceId } });
  if (!channel) return;
  let connected = channel.provider === 'DEV_MOCK';
  let errorMessage = '';
  try {
    const config = decryptIntegrationConfig(channel.settingsJson);
    if (channel.provider === 'EMAIL') {
      const port = Number(config.port || 587);
      const transport = nodemailer.createTransport({ host: String(config.host || ''), port, secure: port === 465, auth: { user: String(config.user || ''), pass: String(config.pass || '') } });
      connected = await transport.verify();
    } else if (channel.provider === 'WHATSAPP') {
      const response = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v23.0'}/${String(config.phoneId || '')}?fields=id,display_phone_number`, { headers: { Authorization: `Bearer ${String(config.accessToken || '')}` }, cache: 'no-store' });
      connected = response.ok;
      if (!response.ok) errorMessage = `Meta HTTP ${response.status}`;
    } else if (channel.provider === 'INSTAGRAM' || channel.provider === 'FACEBOOK') {
      const response = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v23.0'}/me?fields=id,name`, { headers: { Authorization: `Bearer ${String(config.accessToken || '')}` }, cache: 'no-store' });
      connected = response.ok;
      if (!response.ok) errorMessage = `Meta HTTP ${response.status}`;
    }
  } catch (error) {
    connected = false;
    errorMessage = error instanceof Error ? error.message : 'Connection test failed';
  }
  await db.channel.update({ where: { id: channel.id }, data: { healthStatus: connected ? 'CONNECTED' : 'ERROR' } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'CHANNEL_CONNECTION_TESTED', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ provider: channel.provider, connected, error: errorMessage.slice(0, 200) }) } });
  revalidatePath('/settings/integrations');
}

export default async function IntegrationsSettingsPage() {
  const { workspaceId, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channels = await db.channel.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
  return <div className="space-y-7 pb-12">
    <PageHeader title="التكاملات والقنوات" description="الحالة أدناه مأخوذة من سجلات الاتصال. إضافة قناة حقيقية تنشئ إعدادًا غير متصل ولا تدّعي نجاح الربط قبل OAuth أو المفاتيح وفحص Webhook." />
    <div className="grid gap-4 md:grid-cols-2">{providers.map((provider) => {
      const channel = channels.find((item) => item.provider === provider.id);
      const connected = channel?.healthStatus === 'CONNECTED';
      const config = channel?.settingsJson ? decryptIntegrationConfig(channel.settingsJson) : {};
      return <div key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-bold"><Cable className="h-4 w-4 text-brand-600" />{provider.name}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{provider.note}</p></div><span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{connected ? <CheckCircle2 className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}{connected ? 'متصل' : 'غير متصل'}</span></div>
        {!channel && <form action={addChannel} className="mt-4"><input type="hidden" name="provider" value={provider.id} /><button className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700">إنشاء إعداد القناة</button></form>}
        {channel && !connected && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800">الإعداد موجود، ويحتاج بيانات الاعتماد الخارجية المذكورة في INTEGRATIONS.md.</p>}
        {channel && provider.id !== 'DEV_MOCK' && <form action={saveChannelConfiguration} className="mt-4 grid gap-2"><input type="hidden" name="channelId" value={channel.id} />{provider.id === 'EMAIL' ? <><input name="host" placeholder={`SMTP host (${String(config.host || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" /><div className="grid grid-cols-2 gap-2"><input name="port" type="number" placeholder={`Port (${String(config.port || 587)})`} className="rounded-lg border bg-transparent p-2 text-xs" /><input name="user" placeholder={`User (${String(config.user || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" /></div><input name="pass" type="password" autoComplete="new-password" placeholder={`Password (${maskSecret(String(config.pass || ''))})`} className="rounded-lg border bg-transparent p-2 text-xs" /><input name="from" type="email" placeholder={`From (${String(config.from || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" /></> : <><input name="accessToken" type="password" autoComplete="new-password" placeholder={`Access token (${maskSecret(String(config.accessToken || ''))})`} className="rounded-lg border bg-transparent p-2 text-xs" />{provider.id === 'WHATSAPP' && <input name="phoneId" placeholder={`Phone number ID (${String(config.phoneId || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" />}</>}<button className="rounded-lg border px-3 py-2 text-xs font-bold">حفظ مشفرًا</button></form>}
        {channel && <form action={testChannelConnection} className="mt-2"><input type="hidden" name="channelId" value={channel.id} /><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">فحص الاتصال</button></form>}
      </div>;
    })}</div>
  </div>;
}
