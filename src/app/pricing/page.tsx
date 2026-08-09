import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { db } from '@/lib/db';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';
import { PricingCards, PlanData } from '@/components/landing/PricingCards';

export default async function PricingPage() {
  const branding = await getPlatformBranding();

  let plans: PlanData[] = [];
  try {
    const dbPlans = await db.plan.findMany({
      where: { isActive: true },
      include: { prices: true, entitlements: true },
      orderBy: { sortingOrder: 'asc' },
    });
    plans = dbPlans.map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      description: p.description,
      monthlyPrice: p.prices.find((pr) => pr.interval === 'MONTHLY')?.price || 199,
      yearlyPrice: p.prices.find((pr) => pr.interval === 'YEARLY')?.price || 1990,
      currency: p.prices[0]?.currency || 'SAR',
      maxUsers: p.entitlements?.maxUsers || 5,
      maxContacts: p.entitlements?.maxContacts || 5000,
      maxMessages: p.entitlements?.maxMessages || 20000,
      enableWhitelabel: p.entitlements?.enableWhitelabel || false,
    }));
  } catch {}

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">خطط وأسعار المنصة</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm">
            باقات مرنة تناسب الأنشطة الصغيرة، النامية والشركات الكبيرة.
          </p>
        </div>
        <PricingCards plans={plans} />
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
