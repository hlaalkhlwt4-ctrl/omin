import { ResetPasswordForm } from './ResetPasswordForm';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950" dir="rtl"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900"><ResetPasswordForm token={token || ''} /></div></main>;
}
