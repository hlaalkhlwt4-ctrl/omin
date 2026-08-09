import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';

export default async function AboutPage() {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">عن منصة {branding.platformName}</h1>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          تأسست منصة {branding.platformName} بهدف توفير بيئة عمل عربية متكاملة تدمج إدارة العملاء، قنوات المحادثات الموحدة، الفواتير والأرباح، والأتمتة بالذكاء الاصطناعي لمساعدة الأنشطة التجارية والتجار والمستقلين على إدارة أعمالهم بكفاءة واحترافية.
        </p>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
