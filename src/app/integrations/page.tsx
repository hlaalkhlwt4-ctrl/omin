import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';

export default async function IntegrationsPage() {
  const branding = await getPlatformBranding();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">دليل وتكاملات القنوات الخارجية</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm">
            اربط قناتك المفضلة رسمياً عبر المفاتيح والتفويضات المسموحة بسهولة وأمان.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">رسمي Official API</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">WhatsApp Cloud API</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">ربط مباشر برقم واتساب الأعمال عبر Meta Developer App مع حماية الـ Webhook.</p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">Meta OAuth</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Instagram Professional DM</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">استقبال وترديد الرسائل الخاصة بحسابات الأعمال والمنشئين وفق صلاحيات Meta.</p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Meta OAuth</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Facebook Messenger</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">ربط صفحات الفيسبوك وتحديث الرسائل والتعليقات المسموحة.</p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Google OAuth 2.0</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gmail API</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">مزامنة تدرجية وآمنة لرسائل البريد الإلكتروني دون إعادة التحميل الإجباري.</p>
          </div>
        </div>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
