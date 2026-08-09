'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';

export function AcceptInvitationClient({ token }: { token?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? '' : 'رابط الدعوة غير مكتمل.');

  async function accept() {
    if (!token) return;
    setLoading(true);
    setError('');
    const response = await fetch('/api/team/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (response.status === 401) {
      const next = `/invitations/accept?token=${encodeURIComponent(token)}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setLoading(false);
    if (!response.ok) {
      setError(data.error || 'تعذر قبول الدعوة.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <Users className="mx-auto h-12 w-12 text-brand-600" />
      <h1 className="mt-4 text-xl font-extrabold">دعوة للانضمام إلى فريق</h1>
      <p className="mt-2 text-xs leading-6 text-slate-500">سنتحقق من بريد حسابك ثم نضيف النشاط إلى قائمة أنشطتك.</p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
      <button disabled={!token || loading} onClick={accept} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-xs font-bold text-white disabled:opacity-50">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} قبول الدعوة
      </button>
      <p className="mt-4 text-xs text-slate-500">ليس لديك حساب؟ <Link className="font-bold text-brand-600" href="/signup">أنشئ حسابًا بنفس البريد المدعو</Link></p>
    </div>
  );
}
