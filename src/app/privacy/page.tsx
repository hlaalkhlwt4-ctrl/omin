import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';

export default async function PrivacyPage() {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">سياسة الخصوصية وحماية البيانات</h1>
        <p>تلتزم منصة {branding.platformName} بحماية خصوصية كافة المستخدمين والأنشطة التجارية المشتركة والعملاء النهائيين.</p>
        <h2 className="text-base font-bold text-slate-900 dark:text-white pt-4">1. عزل بيانات المستأجرين (Multi-Tenant Isolation)</h2>
        <p>يتم عزل كافة البيانات الخاصة برقم النشاط المعرف (Workspace ID) في قاعدة البيانات بآليات Row Level Security حقيقية ولا يتم مشاركتها أو إتاحتها لأي مستأجر آخر تحت أي ظرف.</p>
        <h2 className="text-base font-bold text-slate-900 dark:text-white pt-4">2. التشفير وأسرار القنوات</h2>
        <p>تُخزن جميع مفاتيح API وأدوات الربط والرموز المميزة (OAuth Tokens) بصورة مشفرة تماماً على الخادم ولا تُرسل متصفحات العملاء مطلقاً.</p>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
