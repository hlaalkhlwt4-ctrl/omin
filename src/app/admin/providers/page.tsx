import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Bot, CheckCircle2, ChevronRight, KeyRound, Mail, ShieldAlert, XCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createSmtpTransport } from '@/lib/email';
import { decryptIntegrationConfig, encryptIntegrationConfig, maskSecret } from '@/lib/integration-secrets';
import { getPlatformSmtpSettings } from '@/lib/platform-providers';
import { structuredLog } from '@/lib/observability';
import {
  ADDABLE_AI_PROVIDER_IDS,
  AI_PROVIDERS,
  choosePreferredAiModel,
  isAiProviderId,
  type AddableAiProviderId,
} from '@/lib/ai-provider-catalog';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-xs dark:border-slate-700';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin) redirect('/dashboard');
  return user;
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

type AiKeyInspection = {
  connected: boolean;
  availableModels: string[];
  modelId: string;
  balance: number | null;
  errorMessage: string;
};

async function inspectAiKey(input: { provider: AddableAiProviderId; apiKey: string; baseUrl?: string }): Promise<AiKeyInspection> {
  const baseUrl = (input.baseUrl || AI_PROVIDERS[input.provider].baseUrl).replace(/\/$/, '');
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${input.apiKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 250)}`);
    const body = await response.json() as { data?: Array<{ id?: string }> };
    const availableModels = ((body.data?.map((item) => item.id).filter(Boolean) || []) as string[]).slice(0, 500);
    const modelId = choosePreferredAiModel(input.provider, availableModels);
    if (!modelId) throw new Error('تم قبول المفتاح، لكن المزود لم يُرجع أي نموذج متاح.');
    let balance: number | null = null;
    if (input.provider === 'OPENROUTER') {
      const keyResponse = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${input.apiKey}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      if (!keyResponse.ok) throw new Error(`HTTP ${keyResponse.status}: مفتاح OpenRouter غير صالح.`);
      const keyMetadata = await keyResponse.json() as { data?: { limit_remaining?: number | null } };
      if (typeof keyMetadata.data?.limit_remaining === 'number' && Number.isFinite(keyMetadata.data.limit_remaining)) balance = keyMetadata.data.limit_remaining;
      const creditResponse = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${input.apiKey}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      if (creditResponse.ok) {
        const credits = await creditResponse.json() as { data?: { total_credits?: number; total_usage?: number } };
        balance = Number(credits.data?.total_credits || 0) - Number(credits.data?.total_usage || 0);
      }
    }
    return { connected: true, availableModels, modelId, balance, errorMessage: '' };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'AI provider test failed';
    return {
      connected: false,
      availableModels: [],
      modelId: AI_PROVIDERS[input.provider].models[0] || 'unavailable',
      balance: null,
      errorMessage: rawMessage.replaceAll(input.apiKey, '[REDACTED]').slice(0, 500),
    };
  }
}

async function saveAndTestAiKey(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const providerValue = String(formData.get('provider') || '');
  const apiKey = String(formData.get('apiKey') || '').trim();
  if (!ADDABLE_AI_PROVIDER_IDS.includes(providerValue as AddableAiProviderId) || apiKey.length < 8) {
    redirect('/admin/providers?ai=invalid');
  }
  const provider = providerValue as AddableAiProviderId;
  const inspection = await inspectAiKey({ provider, apiKey });
  const existingCount = await db.platformAiModel.count({ where: { provider } });
  const hasDefault = await db.platformAiModel.count({ where: { isDefault: true } });
  const shouldBeDefault = inspection.connected && hasDefault === 0;
  const model = await db.platformAiModel.create({
    data: {
      displayName: AI_PROVIDERS[provider].label,
      provider,
      baseUrl: AI_PROVIDERS[provider].baseUrl,
      modelId: inspection.modelId,
      encryptedConfig: encryptIntegrationConfig({
        apiKey,
        priority: Math.min(existingCount + 1, 100),
        availableModels: inspection.availableModels,
        balance: inspection.balance,
        balanceCurrency: 'USD',
      }),
      isActive: inspection.connected,
      isDefault: shouldBeDefault,
      status: inspection.connected ? 'CONNECTED' : 'ERROR',
      lastTestedAt: new Date(),
      lastError: inspection.connected ? null : inspection.errorMessage,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'PLATFORM_AI_KEY_CREATED_AND_TESTED',
      targetType: 'PLATFORM_AI_MODEL',
      targetId: model.id,
      metadata: JSON.stringify({ provider, connected: inspection.connected, modelId: inspection.modelId, isDefault: shouldBeDefault }),
    },
  });
  revalidatePath('/admin/providers');
  redirect(`/admin/providers?ai=${inspection.connected ? 'connected' : 'failed'}`);
}

async function testAiModel(formData: FormData) {
  'use server';
  const user = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  const model = await db.platformAiModel.findUnique({ where: { id } });
  if (!model) return;
  const config = decryptIntegrationConfig(model.encryptedConfig);
  const provider: AddableAiProviderId = isAiProviderId(model.provider) && model.provider !== 'CUSTOM' ? model.provider : 'OPENAI';
  const inspection = await inspectAiKey({ provider, apiKey: String(config.apiKey || ''), baseUrl: model.baseUrl });
  await db.$transaction([
    db.platformAiModel.update({
      where: { id },
      data: {
        modelId: inspection.modelId,
        encryptedConfig: encryptIntegrationConfig({ ...config, availableModels: inspection.availableModels, balance: inspection.balance, balanceCurrency: 'USD' }),
        isActive: inspection.connected,
        status: inspection.connected ? 'CONNECTED' : 'ERROR',
        lastTestedAt: new Date(),
        lastError: inspection.connected ? null : inspection.errorMessage,
      },
    }),
    db.auditLog.create({ data: { actorId: user.id, action: 'PLATFORM_AI_MODEL_TESTED', targetType: 'PLATFORM_AI_MODEL', targetId: id, metadata: JSON.stringify({ connected: inspection.connected, modelId: inspection.modelId }) } }),
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

export default async function PlatformProvidersPage({ searchParams }: { searchParams: Promise<{ smtp?: string; ai?: string }> }) {
  await requireSuperAdmin();
  const { smtp: smtpResult, ai: aiResult } = await searchParams;
  const [smtpRecord, models] = await Promise.all([
    db.platformEmailConfig.findUnique({ where: { id: 'default' } }),
    db.platformAiModel.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }),
  ]);
  const smtp = smtpRecord ? decryptIntegrationConfig(smtpRecord.encryptedConfig) : {};

  return <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-brand-600"><ChevronRight className="h-4 w-4" />العودة إلى Super Admin</Link><h1 className="text-2xl font-extrabold">البريد ومفاتيح الذكاء الاصطناعي</h1><p className="mt-2 text-sm text-slate-500">إعدادات مركزية لكل المنصة. المفاتيح مشفرة ولا تظهر بعد الحفظ.</p></div></div>

      {smtpResult === 'saved' && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">تم حفظ إعدادات SMTP بنجاح. اضغط فحص الاتصال للتأكد من بيانات Hostinger.</p>}
      {smtpResult === 'invalid' && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">تحقق من جميع الحقول والمنفذ ثم حاول الحفظ مرة أخرى.</p>}
      {smtpResult === 'failed' && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">تعذر حفظ إعدادات SMTP. لم يتم كشف أي بيانات سرية، وتم تسجيل سبب المشكلة في الخادم.</p>}
      {aiResult === 'connected' && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">تم حفظ المفتاح وفحصه بنجاح، واختير أفضل نموذج متاح تلقائيًا.</p>}
      {aiResult === 'failed' && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">تم حفظ المفتاح، لكن فحصه فشل. راجع سبب الفشل في بطاقة المفتاح.</p>}
      {aiResult === 'invalid' && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">اختر المزوّد والصق مفتاح API صالحًا.</p>}

      <section className={`${cardClass} space-y-5`}><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><Mail className="h-5 w-5 text-sky-600" />SMTP للرسائل النظامية</h2><StatusBadge status={smtpRecord?.status || 'NOT_TESTED'} /></div><form action={saveSmtp} className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold">SMTP Host<input name="host" required defaultValue={String(smtp.host || '')} placeholder="smtp.example.com" className={fieldClass} /></label><label className="text-xs font-bold">Port<input name="port" type="number" min="1" max="65535" required defaultValue={Number(smtp.port || 587)} className={fieldClass} /></label><label className="text-xs font-bold">اسم المستخدم<input name="user" required defaultValue={String(smtp.user || '')} autoComplete="username" className={fieldClass} /></label><label className="text-xs font-bold">كلمة المرور<input name="pass" type="password" autoComplete="new-password" placeholder={maskSecret(String(smtp.pass || ''))} className={fieldClass} /></label><label className="text-xs font-bold">بريد الإرسال<input name="fromEmail" type="email" required defaultValue={String(smtp.fromEmail || '')} className={fieldClass} /></label><label className="text-xs font-bold">اسم المرسل<input name="fromName" required defaultValue={String(smtp.fromName || 'OmniFlow')} className={fieldClass} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="secure" defaultChecked={Boolean(smtp.secure)} />اتصال SSL مباشر (غالبًا للمنفذ 465)</label><button className="rounded-xl bg-brand-600 px-4 py-3 text-xs font-bold text-white md:col-span-2">حفظ إعداد SMTP</button></form><form action={testSmtp} className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><input name="testEmail" type="email" placeholder="بريد اختبار اختياري" className="min-w-56 flex-1 rounded-xl border bg-transparent p-2.5 text-xs" /><button disabled={!smtpRecord} className="rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-40">فحص الاتصال وإرسال اختبار</button></form>{smtpRecord?.lastError && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{smtpRecord.lastError}</p>}</section>

      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Bot className="h-5 w-5 text-violet-600" />مفاتيح الذكاء الاصطناعي</h2>
          <p className="mt-1 text-xs text-slate-500">اختر المزوّد والصق المفتاح فقط. ستحفظ المنصة المفتاح مشفّرًا، وتفحصه، وتسحب النماذج والرصيد المتاح تلقائيًا.</p>
        </div>
        <form action={saveAndTestAiKey} className={`${cardClass} grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end`}>
          <label className="text-xs font-bold">المزوّد
            <select name="provider" required defaultValue="OPENAI" className={fieldClass}>
              {ADDABLE_AI_PROVIDER_IDS.map((providerId) => <option key={providerId} value={providerId}>{AI_PROVIDERS[providerId].label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">API Key
            <input name="apiKey" type="password" required minLength={8} autoComplete="new-password" placeholder="الصق المفتاح هنا" className={fieldClass} />
          </label>
          <button className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white dark:bg-white dark:text-slate-900">حفظ وفحص المفتاح</button>
        </form>
        <div className="grid gap-4 lg:grid-cols-2">{models.map((model) => <AiKeyCard key={model.id} model={model} />)}</div>
      </section>
    </main>
  </div>;
}

type AiModelItem = Awaited<ReturnType<typeof db.platformAiModel.findFirst>>;

function AiKeyCard({ model }: { model: NonNullable<AiModelItem> }) {
  const secret = decryptIntegrationConfig(model.encryptedConfig);
  const provider = isAiProviderId(model.provider) ? model.provider : 'CUSTOM';
  const discovered = Array.isArray(secret.availableModels) ? secret.availableModels.map(String) : [];
  return <article className={`${cardClass} space-y-4`}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-violet-600" /><b>{AI_PROVIDERS[provider].label}</b>{model.isDefault && <span className="rounded bg-violet-100 px-2 py-1 text-[10px] text-violet-700">الافتراضي</span>}</div>
      <StatusBadge status={model.status} />
    </div>
    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-[11px] dark:bg-slate-800 sm:grid-cols-2">
      <span>المفتاح: <b dir="ltr">{maskSecret(String(secret.apiKey || ''))}</b></span>
      <span>النموذج التلقائي: <b dir="ltr">{model.modelId}</b></span>
      <span>النماذج المكتشفة: <b>{discovered.length}</b></span>
      <span>الرصيد: <b>{secret.balance == null ? 'غير متاح من المزود' : `${Number(secret.balance).toFixed(3)} ${String(secret.balanceCurrency || 'USD')}`}</b></span>
    </div>
    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <form action={testAiModel}><input type="hidden" name="id" value={model.id} /><button className="rounded-xl border px-3 py-2 text-xs font-bold">إعادة فحص المفتاح</button></form>
      {!model.isDefault && <form action={makeDefaultModel}><input type="hidden" name="id" value={model.id} /><button disabled={model.status !== 'CONNECTED' || !model.isActive} className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40">استخدامه افتراضيًا</button></form>}
    </div>
    {model.lastError && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{model.lastError}</p>}
  </article>;
}
