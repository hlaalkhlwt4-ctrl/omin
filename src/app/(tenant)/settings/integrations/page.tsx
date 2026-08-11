import { revalidatePath } from 'next/cache';
import { Cable, CheckCircle2, CircleOff, ExternalLink, ShieldCheck } from 'lucide-react';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { requireWorkspaceContext, requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader } from '@/components/app/PageHeader';
import { decryptIntegrationConfig, encryptIntegrationConfig, maskSecret } from '@/lib/integration-secrets';
import { getMetaGraphVersion, isMetaOAuthConfigured } from '@/lib/meta-integration';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

const providers = [
  { id: 'WHATSAPP', name: 'WhatsApp Business', note: 'اربط رقمك من نافذة Meta الرسمية، من دون نسخ Access Token أو إعداد Webhook يدويًا.' },
  { id: 'INSTAGRAM', name: 'Instagram Professional', note: 'سجّل الدخول واختر حساب Business أو Creator. لا تحتاج إلى الشارة الزرقاء.' },
  { id: 'FACEBOOK', name: 'Facebook Messenger', note: 'سجّل الدخول واختر صفحة تملك صلاحية إدارتها.' },
  { id: 'EMAIL', name: 'البريد الإلكتروني', note: 'اربط صندوق البريد عبر إعدادات SMTP الخاصة بمزودك.' },
  { id: 'DEV_MOCK', name: 'المحاكي التطويري', note: 'قناة محلية معزولة لا ترسل رسائل إلى مستلمين حقيقيين.' },
] as const;

const feedback: Record<string, string> = {
  meta_not_configured: 'يجب على مدير المنصة إكمال إعداد تطبيق Meta أولًا.',
  invalid_provider: 'نوع القناة المطلوب غير صالح.',
  oauth_state: 'انتهت جلسة الربط أو تعذر التحقق منها. حاول مرة أخرى.',
  oauth_failed: 'تعذر إكمال الربط مع Meta. تحقق من صلاحيات التطبيق وحاول مجددًا.',
  instagram_not_eligible: 'لم نجد حساب Instagram احترافيًا مرتبطًا بصفحة تديرها.',
  page_not_found: 'لم نجد صفحة Facebook مؤهلة ضمن الحساب.',
};

async function addLocalChannel(formData: FormData) {
  'use server';
  const { workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const provider = String(formData.get('provider') || '');
  if (provider !== 'EMAIL' && provider !== 'DEV_MOCK') return;
  const definition = providers.find((item) => item.id === provider)!;
  const existing = await db.channel.findFirst({ where: { workspaceId, provider } });
  if (!existing) await db.channel.create({ data: { workspaceId, provider, name: definition.name, isActive: provider === 'DEV_MOCK', healthStatus: provider === 'DEV_MOCK' ? 'CONNECTED' : 'DISCONNECTED' } });
  revalidatePath('/settings/integrations');
}

async function saveEmailConfiguration(formData: FormData) {
  'use server';
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channelId = String(formData.get('channelId') || '');
  const channel = await db.channel.findFirst({ where: { id: channelId, workspaceId, provider: 'EMAIL' } });
  if (!channel) return;
  const existing = decryptIntegrationConfig(channel.settingsJson);
  for (const key of ['host', 'port', 'user', 'pass', 'from']) {
    const value = String(formData.get(key) || '').trim();
    if (value) existing[key] = key === 'port' ? Number(value) : value;
  }
  await db.channel.update({ where: { id: channel.id }, data: { settingsJson: encryptIntegrationConfig(existing), healthStatus: 'DISCONNECTED', isActive: true } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'CHANNEL_CREDENTIALS_UPDATED', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ provider: 'EMAIL' }) } });
  revalidatePath('/settings/integrations');
}

async function disconnectChannel(formData: FormData) {
  'use server';
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channelId = String(formData.get('channelId') || '');
  const channel = await db.channel.findFirst({ where: { id: channelId, workspaceId } });
  if (!channel || channel.provider === 'DEV_MOCK') return;
  await db.channel.update({ where: { id: channel.id }, data: { settingsJson: null, healthStatus: 'DISCONNECTED', isActive: false } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'CHANNEL_DISCONNECTED', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ provider: channel.provider }) } });
  revalidatePath('/settings/integrations');
}

async function testEmailConnection(formData: FormData) {
  'use server';
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channelId = String(formData.get('channelId') || '');
  const channel = await db.channel.findFirst({ where: { id: channelId, workspaceId, provider: 'EMAIL' } });
  if (!channel) return;
  let connected = false;
  let errorMessage = '';
  try {
    const config = decryptIntegrationConfig(channel.settingsJson);
    const port = Number(config.port || 587);
    const transport = nodemailer.createTransport({ host: String(config.host || ''), port, secure: port === 465, auth: { user: String(config.user || ''), pass: String(config.pass || '') } });
    connected = await transport.verify();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Connection test failed';
  }
  await db.channel.update({ where: { id: channel.id }, data: { healthStatus: connected ? 'CONNECTED' : 'ERROR' } });
  await db.auditLog.create({ data: { workspaceId, actorId: user.id, action: 'CHANNEL_CONNECTION_TESTED', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ provider: 'EMAIL', connected, error: errorMessage.slice(0, 200) }) } });
  revalidatePath('/settings/integrations');
}

export default async function IntegrationsSettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const [{ workspaceId, role }, query] = await Promise.all([requireWorkspaceContext(), searchParams]);
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  const channels = await db.channel.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
  const metaReady = isMetaOAuthConfigured();
  const whatsappReady = metaReady && Boolean(process.env.META_WHATSAPP_CONFIG_ID);

  return <div className="space-y-7 pb-12">
    <PageHeader title="التكاملات والقنوات" description="اربط حسابات نشاطك من نافذة المزود الرسمية. لا حاجة إلى نسخ مفاتيح أو إعداد Webhooks يدويًا." />
    {query.connected && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">تم ربط القناة بنجاح وأصبحت جاهزة لاستقبال الرسائل.</p>}
    {query.error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800" role="alert">{feedback[query.error] || 'تعذر إكمال عملية الربط.'}</p>}
    {!metaReady && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p className="font-bold">إعداد Meta مطلوب مرة واحدة على مستوى المنصة</p><p className="mt-1 text-xs leading-6">أضف META_APP_ID وMETA_APP_SECRET وMETA_WHATSAPP_CONFIG_ID إلى إعدادات النشر، ثم أعد تشغيل التطبيق.</p></div>}
    <div className="grid gap-4 md:grid-cols-2">{providers.map((provider) => {
      const channel = channels.find((item) => item.provider === provider.id);
      const connected = channel?.healthStatus === 'CONNECTED';
      const config = channel?.settingsJson ? decryptIntegrationConfig(channel.settingsJson) : {};
      const isMeta = provider.id === 'WHATSAPP' || provider.id === 'INSTAGRAM' || provider.id === 'FACEBOOK';
      return <section key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-bold"><Cable className="h-4 w-4 text-brand-600" />{provider.name}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{provider.note}</p></div><span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{connected ? <CheckCircle2 className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}{connected ? 'متصل' : 'غير متصل'}</span></div>
        {connected && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" />{String(config.verifiedName || config.pageName || channel?.name || 'حساب موثوق')}</p>{config.displayPhoneNumber ? <p className="mt-1">{String(config.displayPhoneNumber)}</p> : null}</div>}
        {!connected && provider.id === 'WHATSAPP' && (whatsappReady
          ? <div className="mt-4"><WhatsAppConnectButton appId={process.env.META_APP_ID!} configId={process.env.META_WHATSAPP_CONFIG_ID!} graphVersion={getMetaGraphVersion()} /></div>
          : <p className="mt-4 text-xs text-amber-700">سيظهر زر الربط بعد إكمال إعداد WhatsApp Embedded Signup.</p>)}
        {!connected && (provider.id === 'INSTAGRAM' || provider.id === 'FACEBOOK') && <a href={`/api/integrations/meta/start?provider=${provider.id}`} aria-disabled={!metaReady} className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white ${metaReady ? 'bg-blue-600 hover:bg-blue-700' : 'pointer-events-none bg-slate-400'}`}><ExternalLink className="h-4 w-4" />ربط عبر Meta</a>}
        {!channel && !isMeta && <form action={addLocalChannel} className="mt-4"><input type="hidden" name="provider" value={provider.id} /><button className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700">إنشاء إعداد القناة</button></form>}
        {channel && provider.id === 'EMAIL' && <form action={saveEmailConfiguration} className="mt-4 grid gap-2"><input type="hidden" name="channelId" value={channel.id} /><input name="host" placeholder={`SMTP host (${String(config.host || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" /><div className="grid grid-cols-2 gap-2"><input name="port" type="number" placeholder={`Port (${String(config.port || 587)})`} className="rounded-lg border bg-transparent p-2 text-xs" /><input name="user" placeholder={`User (${String(config.user || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" /></div><input name="pass" type="password" autoComplete="new-password" placeholder={`Password (${maskSecret(String(config.pass || ''))})`} className="rounded-lg border bg-transparent p-2 text-xs" /><input name="from" type="email" placeholder={`From (${String(config.from || 'غير مضبوط')})`} className="rounded-lg border bg-transparent p-2 text-xs" /><button className="rounded-lg border px-3 py-2 text-xs font-bold">حفظ مشفرًا</button></form>}
        {channel && provider.id === 'EMAIL' && <form action={testEmailConnection} className="mt-2"><input type="hidden" name="channelId" value={channel.id} /><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">فحص الاتصال</button></form>}
        {channel && connected && provider.id !== 'DEV_MOCK' && <form action={disconnectChannel} className="mt-3"><input type="hidden" name="channelId" value={channel.id} /><button className="text-xs font-bold text-rose-600">فصل الحساب</button></form>}
      </section>;
    })}</div>
  </div>;
}
