import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';

export default async function TermsPage() {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الشروط والأحكام</h1>
        <p>مرحباً بك في منصة {branding.platformName}. تنظم هذه الشروط والأحكام استخدامك للمنصة وكافة الخدمات والوحدات المتاحة فيها.</p>
        <h2 className="text-base font-bold text-slate-900 dark:text-white pt-4">1. الحساب والمسؤولية</h2>
        <p>يلتزم المستخدم بعدم استخدام المنصة لإرسال رسائل غير مرغوب فيها (SPAM) أو ممارسات تخالف سياسات مزودي القنوات (Meta, WhatsApp, Google).</p>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
