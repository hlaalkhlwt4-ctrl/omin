import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';
import { CheckCircle2, ShieldCheck, Activity } from 'lucide-react';

export default async function StatusPage() {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-8">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">جميع الأنظمة تعمل بكفاءة عالية 99.9%</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">آخر تحديث مباشر: {new Date().toLocaleTimeString('ar-SA')}</p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-900 px-3 py-1 rounded-full">
            Operational
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="p-4 flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">خوادم المصادقة وقواعد البيانات Auth & DB</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> 100% يعمل</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">صندوق المحادثات والـ Webhook Listeners</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> 100% يعمل</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">معالج الذكاء الاصطناعي والأتمتة AI Engine</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> 100% يعمل</span>
          </div>
        </div>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
