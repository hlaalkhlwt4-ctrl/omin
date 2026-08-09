'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال الطلب.');
      setMessage(data.message); setPreviewUrl(data.previewUrl || '');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر إرسال الطلب.'); }
    finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950" dir="rtl"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="mb-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white"><KeyRound className="h-5 w-5" /></span><h1 className="mt-4 text-xl font-extrabold">استعادة كلمة المرور</h1><p className="mt-2 text-xs leading-6 text-slate-500">سنرسل رابطًا صالحًا لمدة 30 دقيقة إذا كان البريد مسجلًا.</p></div>{error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}{message && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{message}</p>}{previewUrl && <Link href={previewUrl} className="mb-4 block rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">فتح رابط المعاينة المحلية (يظهر في التطوير فقط)</Link>}<form onSubmit={submit} className="space-y-4"><label className="block text-xs font-bold">البريد الإلكتروني<div className="relative mt-2"><Mail className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent py-3 pe-10 ps-3 text-xs dark:border-slate-700" /></div></label><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-xs font-bold text-white disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}إرسال رابط الاستعادة</button></form><Link href="/login" className="mt-5 block text-center text-xs font-bold text-brand-600">العودة لتسجيل الدخول</Link></div></main>;
}
