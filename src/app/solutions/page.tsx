import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';
import { Store, Laptop, UserCheck, Briefcase, GraduationCap, Calendar } from 'lucide-react';

export default async function SolutionsPage() {
  const branding = await getPlatformBranding();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">حلول مخصصة حسب نوع نشاطك التجاري</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm">
            صُممت منصة {branding.platformName} للتكيف تماماً مع نموذج عملك سواء كنت تبيع منتجات، دورات، اشتراكات أو خدمات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Store className="w-8 h-8 text-brand-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">متاجر المنتجات المادية</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">إدارة المخزون، الشحن، عناوين التوصيل، متابعة الطلبات وتنبيه التأخير عبر الواتساب.</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Laptop className="w-8 h-8 text-sky-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">المنتجات الرقمية والاشتراكات</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">تتبع انتهاء الاشتراكات، تسليم الأكواد والملفات، والتذكير الآلي للتجديد.</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <UserCheck className="w-8 h-8 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">المستقلون ومقدمو الخدمات</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">إصدار عروض الأسعار والفواتير، متابعة الدفعات، وتنظيم تواصل العملاء بمكان واحد.</p>
          </div>
        </div>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
