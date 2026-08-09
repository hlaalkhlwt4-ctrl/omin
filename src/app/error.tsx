'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900"><AlertTriangle className="mx-auto h-8 w-8 text-rose-600" /><h1 className="mt-4 text-lg font-extrabold">تعذر تحميل هذه الصفحة</h1><p className="mt-2 text-xs leading-6 text-slate-500">لم يتم حفظ أي إجراء غير مكتمل. حاول مرة أخرى، وإن تكرر الخطأ راجع سجل الخادم الآمن.</p><button onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white"><RotateCcw className="h-4 w-4" />إعادة المحاولة</button></div></main>;
}
