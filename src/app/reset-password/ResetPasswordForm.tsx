'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, LockKeyhole } from 'lucide-react';

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'تعذر التحديث.'); setDone(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر التحديث.'); }
    finally { setLoading(false); }
  }
  if (done) return <div className="text-center"><h1 className="text-xl font-extrabold">تم تحديث كلمة المرور</h1><p className="mt-2 text-xs text-slate-500">أُلغيت الجلسات القديمة ويمكنك الدخول بكلمة المرور الجديدة.</p><Link href="/login" className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-xs font-bold text-white">تسجيل الدخول</Link></div>;
  return <><div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white"><LockKeyhole className="h-5 w-5" /></span><h1 className="mt-4 text-xl font-extrabold">كلمة مرور جديدة</h1><p className="mt-2 text-xs text-slate-500">استخدم 10 أحرف على الأقل وتجنب الكلمات الشائعة.</p></div>{error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}<form onSubmit={submit} className="mt-5 space-y-4"><input type="password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور الجديدة" className="w-full rounded-xl border border-slate-300 bg-transparent p-3 text-xs dark:border-slate-700" /><input type="password" required minLength={10} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="تأكيد كلمة المرور" className="w-full rounded-xl border border-slate-300 bg-transparent p-3 text-xs dark:border-slate-700" /><button disabled={loading || !token} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-xs font-bold text-white disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}حفظ كلمة المرور</button></form></>;
}
