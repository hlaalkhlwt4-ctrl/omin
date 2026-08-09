import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Bot, CheckCircle2, ChevronRight, Mail, ShieldAlert, XCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createSmtpTransport } from '@/lib/email';
import { decryptIntegrationConfig, encryptIntegrationConfig, maskSecret } from '@/lib/integration-secrets';
import { getPlatformSmtpSettings } from '@/lib/platform-providers';
import { structuredLog } from '@/lib/observability';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-xs dark:border-slate-700';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin) redirect('/dashboard');
  return user;
}

function safeBaseUrl(value: string) {
  const url = new URL(value);
  const localAllowed = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localAllowed) throw new Error('يجب أن يستخدم رابط المزود HTTPS.');
  return url.toString().replace(/\/$/, '');
}

async function saveSmtp(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  let result: 'saved' | 'invalid' | 'failed' = 'saved';

  try {
    const existingRecord = await db.platformEmailConfig.findUnique({ where: { id: 'default' } });
    const existing = existingRecord ? decryptIntegrationConfig(existingRecord.encryptedConfig) : {};
    const config = {
      host: String(formData.get('host') || '').trim(),
      port: Number(formData.get('port') || 587),
      secure: formData.get('secure') === 'on',
      user: String(formData.get('user') || '').trim(),
      pass: String(formData.get('pass') || '').trim() || String(existing.pass || ''),
      fromEmail: String(formData.get('fromEmail') || '').trim(),
      fromName: String(formData.get('fromName') || 'OmniFlow').trim(),
    };

    if (!config.host || !config.user || !config.pass || !config.fromEmail || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      result = 'invalid';
    } else {
      await db.$transaction([
        db.platformEmailConfig.upsert({
          where: { id: 'default' },
          update: { encryptedConfig: encryptIntegrationConfig(config), hostLabel: `${config.host}:${config.port}`, fromEmail: config.fromEmail, status: 'NOT_TESTED', lastError: null },
          create: { id: 'default', encryptedConfig: encryptIntegrationConfig(config), hostLabel: `${config.host}:${config.port}`, fromEmail: config.fromEmail },
        }),
        db.auditLog.create({ data: { actorId: user.id, action: 'PLATFORM_SMTP_UPDATED', targetType: 'PLATFORM_EMAIL_CONFIG', targetId: 'default' } }),
      ]);
      revalidatePath('/admin/providers');
    }
  } catch (error) {
    result = 'failed';
    structuredLog('error', 'platform_smtp_save_failed', {
      actorId: user.id,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    });
  }

  redirect(`/admin/providers?smtp=${result}`);
}

async function testSmtp(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const testEmail = String(formData.get('testEmail') || '').trim();
  const config = await getPlatformSmtpSettings({ allowUntested: true });
  if (!config) return;
  let connected = false;
  let errorMessage = '';
  try {
    const transport = createSmtpTransport(config);
    connected = await transport.verify();
    if (connected && testEmail) {
      await transport.sendMail({ from: `"${config.fromName.replace(/[\r\n"]/g, '')}" <${config.fromEmail}>`, to: testEmail, subject: 'اختبار ربط SMTP — OmniFlow', text: 'تم ربط SMTP بنجاح من لوحة مدير منصة OmniFlow.' });
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'SMTP test failed';
  }
  await db.$transaction([
    db.platformEmailConfig.update({ where: { id: 'default' }, data: { status: connected ? 'CONNECTED' : 'ERROR', lastTestedAt: new Date(), lastError: connected ? null : errorMessage.slice(0, 500) } }),
    db.auditLog.create({ data: { actorId: user.id, action: 'PLATFORM_SMTP_TESTED', targetType: 'PLATFORM_EMAIL_CONFIG', targetId: 'default', metadata: JSON.stringify({ connected, sentTestEmail: Boolean(connected && testEmail) }) } }),
  ]);
  revalidatePath('/admin/providers');
}

async function saveAiModel(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const existingRecord = id ? await db.platformAiModel.findUnique({ where: { id } }) : null;
  const existing = existingRecord ? decryptIntegrationConfig(existingRecord.encryptedConfig) : {};
  const displayName = String(formData.get('displayName') || '').trim();
  const modelId = String(formData.get('modelId') || '').trim();
  const baseUrl = safeBaseUrl(String(formData.get('baseUrl') || 'https://api.openai.com/v1').trim());
  const apiKey = String(formData.get('apiKey') || '').trim() || String(existing.apiKey || '');
  const isActive = formData.get('isActive') === 'on';
  const isDefault = formData.get('isDefault') === 'on';
  if (!displayName || !modelId || !apiKey) return;
  const encryptedConfig = encryptIntegrationConfig({ apiKey });
  const model = await db.$transaction(async (tx) => {
    if (isDefault) await tx.platformAiModel.updateMany({ data: { isDefault: false } });
    return id
      ? tx.platformAiModel.update({ where: { id }, data: { displayName, modelId, baseUrl, encryptedConfig, isActive, isDefault, status: 'NOT_TESTED', lastError: null } })
      : tx.platformAiModel.create({ data: { displayName, modelId, baseUrl, encryptedConfig, isActive, isDefault } });
  });
  await db.auditLog.create({ data: { actorId: user.id, action: id ? 'PLATFORM_AI_MODEL_UPDATED' : 'PLATFORM_AI_MODEL_CREATED', targetType: 'PLATFORM_AI_MODEL', targetId: model.id, metadata: JSON.stringify({ modelId, baseUrl, isDefault }) } });
  revalidatePath('/admin/providers');
}

async function testAiModel(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const model = await db.platformAiModel.findUnique({ where: { id } });
  if (!model) return;
  const config = decryptIntegrationConfig(model.encryptedConfig);
  let connected = false;
  let errorMessage = '';
  try {
    const response = await fetch(`${model.baseUrl.replace(/\/$/, '')}/models`, { headers: { Authorization: `Bearer ${String(config.apiKey || '')}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const body = await response.json() as { data?: Array<{ id?: string }> };
    const ids = body.data?.map((item) => item.id).filter(Boolean) || [];
    if (ids.length > 0 && !ids.includes(model.modelId)) throw new Error(`تم الاتصال، لكن النموذج ${model.modelId} غير موجود في قائمة المزود.`);
    connected = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'AI provider test failed';
  }
  await db.$transaction([
    db.platformAiModel.update({ where: { id }, data: { status: connected ? 'CONNECTED' : 'ERROR', lastTestedAt: new Date(), lastError: connected ? null : errorMessage.slice(0, 500) } }),
    db.auditLog.create({ data: { actorId: user.id, action: 'PLATFORM_AI_MODEL_TESTED', targetType: 'PLATFORM_AI_MODEL', targetId: id, metadata: JSON.stringify({ connected, modelId: model.modelId }) } }),
  ]);
  revalidatePath('/admin/providers');
}

async function makeDefaultModel(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const model = await db.platformAiModel.findUnique({ where: { id } });
  if (!model || !model.isActive || model.status !== 'CONNECTED') return;
  await db.$transaction([
    db.platformAiModel.updateMany({ data: { isDefault: false } }),
    db.platformAiModel.update({ where: { id }, data: { isDefault: true } }),
    db.auditLog.create({ data: { actorId: user.id, action: 'PLATFORM_AI_MODEL_DEFAULT_CHANGED', targetType: 'PLATFORM_AI_MODEL', targetId: id } }),
  ]);
  revalidatePath('/admin/providers');
}

function StatusBadge({ status }: { status: string }) {
  const connected = status === 'CONNECTED';
  const failed = status === 'ERROR';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${connected ? 'bg-emerald-100 text-emerald-700' : failed ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{connected ? <CheckCircle2 className="h-3 w-3" /> : failed ? <XCircle className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}{connected ? 'متصل' : failed ? 'فشل الفحص' : 'غير مفحوص'}</span>;
}

export default async function PlatformProvidersPage({ searchParams }: { searchParams: Promise<{ smtp?: string }> }) {
  await requireSuperAdmin();
  const { smtp: smtpResult } = await searchParams;
  const [smtpRecord, models] = await Promise.all([
    db.platformEmailConfig.findUnique({ where: { id: 'default' } }),
    db.platformAiModel.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }),
  ]);
  const smtp = smtpRecord ? decryptIntegrationConfig(smtpRecord.encryptedConfig) : {};

  return <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-brand-600"><ChevronRight className="h-4 w-4" />العودة إلى Super Admin</Link><h1 className="text-2xl font-extrabold">البريد ونماذج الذكاء الاصطناعي</h1><p className="mt-2 text-sm text-slate-500">إعدادات مركزية لكل المنصة. الأسرار مشفرة ولا تظهر بعد الحفظ.</p></div></div>

      {smtpResult === 'saved' && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">تم حفظ إعدادات SMTP بنجاح. اضغط فحص الاتصال للتأكد من بيانات Hostinger.</p>}
      {smtpResult === 'invalid' && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">تحقق من جميع الحقول والمنفذ ثم حاول الحفظ مرة أخرى.</p>}
      {smtpResult === 'failed' && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">تعذر حفظ إعدادات SMTP. لم يتم كشف أي بيانات سرية، وتم تسجيل سبب المشكلة في الخادم.</p>}

      <section className={`${cardClass} space-y-5`}><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><Mail className="h-5 w-5 text-sky-600" />SMTP للرسائل النظامية</h2><StatusBadge status={smtpRecord?.status || 'NOT_TESTED'} /></div><form action={saveSmtp} className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold">SMTP Host<input name="host" required defaultValue={String(smtp.host || '')} placeholder="smtp.example.com" className={fieldClass} /></label><label className="text-xs font-bold">Port<input name="port" type="number" min="1" max="65535" required defaultValue={Number(smtp.port || 587)} className={fieldClass} /></label><label className="text-xs font-bold">اسم المستخدم<input name="user" required defaultValue={String(smtp.user || '')} autoComplete="username" className={fieldClass} /></label><label className="text-xs font-bold">كلمة المرور<input name="pass" type="password" autoComplete="new-password" placeholder={maskSecret(String(smtp.pass || ''))} className={fieldClass} /></label><label className="text-xs font-bold">بريد الإرسال<input name="fromEmail" type="email" required defaultValue={String(smtp.fromEmail || '')} className={fieldClass} /></label><label className="text-xs font-bold">اسم المرسل<input name="fromName" required defaultValue={String(smtp.fromName || 'OmniFlow')} className={fieldClass} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="secure" defaultChecked={Boolean(smtp.secure)} />اتصال SSL مباشر (غالبًا للمنفذ 465)</label><button className="rounded-xl bg-brand-600 px-4 py-3 text-xs font-bold text-white md:col-span-2">حفظ إعداد SMTP</button></form><form action={testSmtp} className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><input name="testEmail" type="email" placeholder="بريد اختبار اختياري" className="min-w-56 flex-1 rounded-xl border bg-transparent p-2.5 text-xs" /><button disabled={!smtpRecord} className="rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-40">فحص الاتصال وإرسال اختبار</button></form>{smtpRecord?.lastError && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{smtpRecord.lastError}</p>}</section>

      <section className="space-y-4"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Bot className="h-5 w-5 text-violet-600" />نماذج AI</h2><p className="mt-1 text-xs text-slate-500">يدعم OpenAI وأي مزود يطبق واجهة OpenAI المتوافقة. لا يمكن اعتماد نموذج افتراضي إلا بعد نجاح الفحص.</p></div><div className="grid gap-4 lg:grid-cols-2">{models.map((model) => <AiModelForm key={model.id} model={model} />)}<AiModelForm /></div></section>
    </main>
  </div>;
}

type AiModelItem = Awaited<ReturnType<typeof db.platformAiModel.findFirst>>;

function AiModelForm({ model }: { model?: NonNullable<AiModelItem> }) {
  const secret = model ? decryptIntegrationConfig(model.encryptedConfig) : {};
  return <div className={`${cardClass} space-y-4`}><div className="flex items-center justify-between gap-2"><div><b>{model?.displayName || 'إضافة نموذج جديد'}</b>{model?.isDefault && <span className="mr-2 rounded bg-violet-100 px-2 py-1 text-[10px] text-violet-700">الافتراضي</span>}</div>{model && <StatusBadge status={model.status} />}</div><form action={saveAiModel} className="grid gap-3"><input type="hidden" name="id" value={model?.id || ''} /><label className="text-xs font-bold">اسم العرض<input name="displayName" required defaultValue={model?.displayName} placeholder="OpenAI GPT-4.1 mini" className={fieldClass} /></label><label className="text-xs font-bold">Base URL<input name="baseUrl" type="url" required defaultValue={model?.baseUrl || 'https://api.openai.com/v1'} className={fieldClass} /></label><label className="text-xs font-bold">Model ID<input name="modelId" required defaultValue={model?.modelId} placeholder="gpt-4.1-mini" className={fieldClass} /></label><label className="text-xs font-bold">API Key<input name="apiKey" type="password" autoComplete="new-password" placeholder={maskSecret(String(secret.apiKey || ''))} className={fieldClass} /></label><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isActive" defaultChecked={model?.isActive ?? true} />نشط</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isDefault" defaultChecked={model?.isDefault} />افتراضي عند الحفظ</label></div><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900">{model ? 'حفظ النموذج' : 'إضافة النموذج'}</button></form>{model && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><form action={testAiModel}><input type="hidden" name="id" value={model.id} /><button className="rounded-xl border px-3 py-2 text-xs font-bold">فحص API والنموذج</button></form>{!model.isDefault && <form action={makeDefaultModel}><input type="hidden" name="id" value={model.id} /><button disabled={model.status !== 'CONNECTED' || !model.isActive} className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40">جعله افتراضيًا</button></form>}</div>}{model?.lastError && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{model.lastError}</p>}</div>;
}
