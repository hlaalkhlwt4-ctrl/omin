import Link from 'next/link';

export default function NotFoundPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950" dir="rtl"><div><p className="text-6xl font-black text-brand-600">404</p><h1 className="mt-4 text-xl font-extrabold">الصفحة غير موجودة</h1><p className="mt-2 text-xs text-slate-500">قد يكون الرابط قديمًا أو لا تملك مسارًا صالحًا إليه.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-xs font-bold text-white">العودة للرئيسية</Link></div></main>;
}
