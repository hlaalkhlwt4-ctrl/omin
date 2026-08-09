'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, MailPlus, UserCog, XCircle } from 'lucide-react';

type Member = { id: string; fullName: string; email: string; role: string; status: string; isCurrentUser: boolean };
type Invitation = { id: string; email: string; role: string; expiresAt: string };

export function TeamClient({ members, invitations }: { members: Member[]; invitations: Invitation[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  async function invite(formData: FormData) {
    setLoading(true); setError(''); setMessage(''); setPreviewUrl('');
    const response = await fetch('/api/team/invitations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), role: formData.get('role') }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error || 'تعذر إرسال الدعوة.');
    setMessage(data.sent ? 'تم إرسال الدعوة بالبريد.' : 'تم إنشاء الدعوة في بيئة التطوير.');
    setPreviewUrl(data.previewUrl || '');
    router.refresh();
  }

  async function updateMember(memberId: string, changes: { role?: string; status?: string }) {
    setError('');
    const response = await fetch('/api/team/members', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, ...changes }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'تعذر تحديث العضو.');
    router.refresh();
  }

  async function revokeInvitation(invitationId: string) {
    const response = await fetch('/api/team/invitations', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId }),
    });
    if (response.ok) router.refresh();
  }

  return <div className="space-y-6">
    <form action={invite} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_180px_auto]">
      <label className="text-xs font-bold">بريد العضو<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700" /></label>
      <label className="text-xs font-bold">الدور<select name="role" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 font-normal dark:border-slate-700"><option value="SALES">مبيعات</option><option value="SUPPORT">دعم</option><option value="ACCOUNTANT">محاسب</option><option value="VIEWER">مشاهدة</option><option value="ADMIN">مدير</option></select></label>
      <button disabled={loading} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />} دعوة</button>
    </form>
    {error && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {message && <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"><p>{message}</p>{previewUrl && <button type="button" onClick={() => navigator.clipboard.writeText(previewUrl)} className="mt-2 inline-flex items-center gap-1 font-bold underline"><Copy className="h-3 w-3" /> نسخ رابط الدعوة التطويري</button>}</div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-200 p-4 font-bold dark:border-slate-800"><UserCog className="h-4 w-4" /> أعضاء الفريق</div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{members.map((member) => <div key={member.id} className="grid items-center gap-3 p-4 text-xs md:grid-cols-[1fr_180px_140px]">
        <div><p className="font-bold">{member.fullName}{member.isCurrentUser ? ' (أنت)' : ''}</p><p className="mt-1 text-slate-500">{member.email}</p></div>
        <select aria-label={`دور ${member.fullName}`} value={member.role} disabled={member.role === 'OWNER'} onChange={(event) => updateMember(member.id, { role: event.target.value })} className="rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700"><option value="OWNER">المالك</option><option value="ADMIN">مدير</option><option value="SALES">مبيعات</option><option value="SUPPORT">دعم</option><option value="ACCOUNTANT">محاسب</option><option value="VIEWER">مشاهدة</option></select>
        <select aria-label={`حالة ${member.fullName}`} value={member.status} disabled={member.role === 'OWNER' || member.isCurrentUser} onChange={(event) => updateMember(member.id, { status: event.target.value })} className="rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700"><option value="ACTIVE">نشط</option><option value="SUSPENDED">موقوف</option></select>
      </div>)}</div>
    </section>

    {invitations.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-bold">الدعوات المعلقة</h2><div className="mt-3 space-y-2">{invitations.map((invitation) => <div key={invitation.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800"><div><p className="font-bold">{invitation.email}</p><p className="text-slate-500">{invitation.role} · تنتهي {new Date(invitation.expiresAt).toLocaleDateString('ar-SA')}</p></div><button onClick={() => revokeInvitation(invitation.id)} className="text-rose-600" aria-label="إلغاء الدعوة"><XCircle className="h-5 w-5" /></button></div>)}</div></section>}
  </div>;
}
