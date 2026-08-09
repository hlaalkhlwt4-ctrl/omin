export default function LoadingPage() {
  return <div className="space-y-6 p-6" aria-label="جارٍ التحميل" aria-live="polite"><div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div><div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" /></div>;
}
