import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';
import { Users, MessageSquare, ShoppingBag, FileText, Zap, Bot, ShieldCheck, BarChart3 } from 'lucide-react';

export default async function FeaturesPage() {
  const branding = await getPlatformBranding();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">مميزات منصة {branding.platformName}</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm">
            استكشف بالتفصيل كل الأدوات والوحدات التي تجعل إدارتك للعملاء، المحادثات، الطلبات، والفواتير أسرع وأسلس.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <Users className="w-8 h-8 text-brand-600" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">إدارة العملاء والملفات موحدة CRM</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              تجميع بيانات العميل من كافة القنوات، الوسوم التفاعلية، استيراد وتصدير ملفات Excel/CSV مع معالجة التكرار، دمج الملفات بتقرير تدقيق، وتخصيص الحقول لكل نشاط.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <MessageSquare className="w-8 h-8 text-sky-600" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">مركز المحادثات الموحد Omnichannel</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              توحيد واتساب الأعمال، إنستغرام DM، فيسبوك ماسنجر، والبريد الإلكتروني في واجهة 3 أجزاء لسطح المكتب ومناسبة للجوال، مع الردود الجاهزة والملاحظات الداخلية.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <ShoppingBag className="w-8 h-8 text-emerald-600" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">مسار الطلبات والمبيعات Pipeline</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              تخصيص مراحل المبيعات، عرض الكانبان والجداول، إنشاء الطلبات بنقرة واحدة من المحادثة، تتبع حالات التسليم، وتنبيه الطلبات المتأخرة.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <FileText className="w-8 h-8 text-amber-600" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">المدفوعات، الفواتير، والمصاريف</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              تسجيل المدفوعات اليدوية والإلكترونية، إصدار فواتير PDF باللغة العربية مع الضريبة، تسجيل مصاريف التشغيل وحساب صافي الأرباح بدقة.
            </p>
          </div>
        </div>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
