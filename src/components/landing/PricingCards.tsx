'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap } from 'lucide-react';

export interface PlanData {
  id: string;
  nameAr: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxUsers: number;
  maxContacts: number;
  maxMessages: number;
  enableWhitelabel: boolean;
  isPopular?: boolean;
}

interface PricingCardsProps {
  plans: PlanData[];
}

export function PricingCards({ plans }: PricingCardsProps) {
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const numberFormatter = new Intl.NumberFormat('en-US');

  return (
    <div className="space-y-8">
      {/* Interval Switcher */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setInterval('MONTHLY')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
              interval === 'MONTHLY'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            دفع شهري
          </button>
          <button
            onClick={() => setInterval('YEARLY')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              interval === 'YEARLY'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>دفع سنوي</span>
            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-extrabold">
              خصم 20%
            </span>
          </button>
        </div>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, idx) => {
          const price = interval === 'YEARLY' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
          const isPro = idx === 1;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                isPro
                  ? 'border-brand-500 shadow-xl shadow-brand-500/10 ring-2 ring-brand-500/20'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-sky-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> الأكثر شعبية واستخداماً
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.nameAr}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{price}</span>
                  <span className="text-xs font-semibold text-slate-500">{plan.currency} / شهرياً</span>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>عدد أعضاء الفريق: <strong>{plan.maxUsers} أعضاء</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>عدد العملاء في CRM: <strong>{numberFormatter.format(plan.maxContacts)} عميل</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>الرسائل الشهرية: <strong>{numberFormatter.format(plan.maxMessages)} رسالة</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>مساعد الذكاء الاصطناعي والأتمتة</span>
                  </div>
                  {plan.enableWhitelabel && (
                    <div className="flex items-center gap-2 text-brand-600 font-semibold">
                      <Zap className="w-4 h-4 text-brand-500 shrink-0" />
                      <span>إزالة العلامة التجارية بالكامل (Whitelabel)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/signup"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs text-center block transition-all ${
                    isPro
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  ابدأ تجربة مجانية 14 يوم
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
