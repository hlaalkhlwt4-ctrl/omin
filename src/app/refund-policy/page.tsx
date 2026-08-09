import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';

export default async function RefundPolicyPage() {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">سياسة الإلغاء والاسترجاع</h1>
        <p>تمنح المنصة فترة تجربة مجانية لمدة 14 يوماً لاختبار كافة الميزات قبل الاشتراك الفعلي.</p>
        <p>يمكن للمستخدم إلغاء التجديد التلقائي في أي وقت من لوحة الإعدادات، ويظل الحساب متاحاً حتى نهاية الفترة المفوترة.</p>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
