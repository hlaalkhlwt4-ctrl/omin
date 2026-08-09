import React from 'react';
import Link from 'next/link';
import { getPlatformBranding } from '@/lib/branding';
import { db } from '@/lib/db';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { PricingCards, PlanData } from '@/components/landing/PricingCards';
import {
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Users,
  ShoppingBag,
  TrendingUp,
  Bot,
  Zap,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';

export const revalidate = 60; // Revalidate dynamic content every 60 seconds

export default async function HomePage() {
  const branding = await getPlatformBranding();

  // Fetch dynamic plans & FAQs from database
  let plans: PlanData[] = [];
  let faqs: Array<{ id: string; question: string; answer: string; category: string }> = [];

  try {
    const dbPlans = await db.plan.findMany({
      where: { isActive: true },
      include: { prices: true, entitlements: true },
      orderBy: { sortingOrder: 'asc' },
    });

    plans = dbPlans.map((p) => {
      const monthly = p.prices.find((pr) => pr.interval === 'MONTHLY')?.price || 199;
      const yearly = p.prices.find((pr) => pr.interval === 'YEARLY')?.price || 1990;
      return {
        id: p.id,
        nameAr: p.nameAr,
        description: p.description,
        monthlyPrice: monthly,
        yearlyPrice: yearly,
        currency: p.prices[0]?.currency || 'SAR',
        maxUsers: p.entitlements?.maxUsers || 5,
        maxContacts: p.entitlements?.maxContacts || 5000,
        maxMessages: p.entitlements?.maxMessages || 20000,
        enableWhitelabel: p.entitlements?.enableWhitelabel || false,
      };
    });

    faqs = await db.faq.findMany({
      where: { isPublished: true },
      orderBy: { sortingOrder: 'asc' },
    });
  } catch (err) {
    // Graceful fallback if database seeding is in progress
  }

  // Default fallback plans if DB is empty
  if (plans.length === 0) {
    plans = [
      {
        id: '1',
        nameAr: 'الباقة الأساسية',
        description: 'مثالية للأفراد والمتاجر الناشئة لتنظيم العملاء والطلبات.',
        monthlyPrice: 99,
        yearlyPrice: 990,
        currency: 'SAR',
        maxUsers: 2,
        maxContacts: 1000,
        maxMessages: 5000,
        enableWhitelabel: false,
      },
      {
        id: '2',
        nameAr: 'باقة المحترفين',
        description: 'الخيار الأكثر شعبية للفرق والمتاجر النامية التي تحتاج أتمتة وذكاء اصطناعي.',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        currency: 'SAR',
        maxUsers: 5,
        maxContacts: 5000,
        maxMessages: 20000,
        enableWhitelabel: false,
      },
      {
        id: '3',
        nameAr: 'باقة الشركات',
        description: 'حل كامل للوكالات والشركات الكبيرة مع تخصيص شامل ودعم أولوية.',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        currency: 'SAR',
        maxUsers: 20,
        maxContacts: 50000,
        maxMessages: 100000,
        enableWhitelabel: true,
      },
    ];
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} logoUrl={branding.logoUrl} />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold shadow-sm">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>المنصة العربية الشاملة لإدارة وحتمية الأنشطة أونلاين</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.2] max-w-4xl mx-auto">
              {branding.landingHeroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {branding.landingHeroSub}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 text-base font-extrabold text-white bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-700 hover:to-sky-600 rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <span>ابدأ تجربتك المجانية الان</span>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm transition-all"
              >
                شاهد كيف تعمل المنصة
              </Link>
            </div>

            {/* Live Interactive UI Preview */}
            <div className="pt-8">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* 2. Channels Ticker */}
        <section className="py-8 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              القنوات المدعومة للتواصل والمبيعات الموحدة
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> WhatsApp Cloud API
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Instagram DM
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Facebook Messenger
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Gmail API
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Outlook Graph
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              * يعتمد تفعيل القنوات الخارجية على توفير المفاتيح الرسمية والموافقات من مزودي الخدمة المعنيين.
            </p>
          </div>
        </section>

        {/* 3. Problem vs Solution */}
        <section className="py-20 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                لماذا تحتاج {branding.platformName} في نشاطك التجاري؟
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
                تحول من التشتت بين التطبيقات المتعددة إلى منصة مركزية مترابطة تسرّع النمو وتضمن رضا العملاء.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Problem Card */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <span>❌ المعاناة والحلول التقليدية</span>
                </h3>
                <ul className="space-y-3 text-xs text-rose-900 dark:text-rose-200">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>ضياع رسائل العملاء وتشتت الفريق بين الواتساب والإنستغرام والإيميل.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>عدم معرفة صافي الأرباح الحقيقي بسبب فصل الطلبات عن المصاريف.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>تأخر الردود على العملاء مما يؤدي لخسارة المبيعات لصالح المنافسين.</span>
                  </li>
                </ul>
              </div>

              {/* Solution Card */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span>✅ الحل الشامل مع {branding.platformName}</span>
                </h3>
                <ul className="space-y-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>صندوق محادثات موحد يستقبل ويرد على كافة القنوات في مكان واحد.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>حساب آلي لصافي الأرباح بإصدار فواتير PDF وتتبع مصاريف التشغيل.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>مساعد ذكاء اصطناعي مدرب يفرز الاستفسارات ويرد فورياً بأعلى جودة.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Core Features Grid */}
        <section id="features" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                منظومة ميزات إنتاجية متكاملة
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
                تم تصميم كل أداة بعناية لتخدم رحلة عملك من وصول العميل حتى الأرباح والمتابعة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">إدارة العملاء CRM</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  جدول تفاعلي، وسوم مخصصة، استيراد وتصدير CSV، دمج الملفات المكررة، وسجل زمني شامل لكافة التفاعلات.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">صندوق المحادثات الموحد</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  محادثات لواتساب، إنستغرام، فيسبوك والبريد في واجهة واحدة ثلاثية الأجزاء مع الردود الجاهزة والملاحظات الداخلية.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">مسار الطلبات والمبيعات</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  لوحة كانبان وتداول مرن للطلبات، تخصيص الحالات، إنشاء طلب بنقرة واحدة من المحادثة، وتنبيه الطلبات المتأخرة.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">الفواتير الضريبية والمصاريف</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  إصدار فواتير PDF باللغة العربية متضمنة الضريبة والهوية، تسجيل الدفعات والمصاريف التشغيلية، وحساب الأرباح.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">محرك الأتمتة التفاعلي</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  إعداد سيناريوهات التقديم، الإشعارات التلقائية عند تغير حالة الطلب، التذكير بالدفع، وتوزيع المهام على الموظفين.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">مساعد الذكاء الاصطناعي</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  تدريب الذكاء الاصطناعي على معرفة نشاطك، اقتراح الردود الدقيقة، تلخيص المحادثات، وتصنيف مشاعر واحتياج العملاء.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Pricing Section */}
        <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                باقات وأسعار شفافة تناسب حجم نشاطك
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
                اختر الباقة المناسبة وابدأ تجربتك المجانية لمدة 14 يوماً بدون الحاجة لبطاقة ائتمان.
              </p>
            </div>

            <PricingCards plans={plans} />
          </div>
        </section>

        {/* 6. FAQ Section */}
        <section id="faq" className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                الأسئلة الشائعة
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                إجابات عن أهم الاستفسارات التقنية والتشغيلية في المنصة.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-brand-500 shrink-0" />
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-7">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Final Call to Action */}
        <section className="py-20 bg-gradient-to-tr from-brand-900 via-brand-700 to-sky-600 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              جاهز لتوحيد وتطوير عملك أونلاين؟
            </h2>
            <p className="text-brand-100 text-sm max-w-xl mx-auto">
              انضم الآن للأنشطة والتجار الذين ينظمون عملاءهم ومحادتثاتهم وأرباحهم عبر منصة {branding.platformName}.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-extrabold text-brand-900 bg-white hover:bg-slate-100 rounded-xl shadow-xl hover:scale-[1.02] transition-all"
              >
                <span>ابدأ الان مجاناً بدون بطاقة</span>
                <ArrowLeft className="w-5 h-5 text-brand-700" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter
        platformName={branding.platformName}
        contactEmail={branding.contactEmail}
        supportPhone={branding.supportPhone}
      />
    </div>
  );
}
