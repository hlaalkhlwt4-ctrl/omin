'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Send,
  Tag,
  Check,
  Search,
  Filter,
  ArrowUpRight,
} from 'lucide-react';

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox'>('dashboard');

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 overflow-hidden">
      {/* Mock App Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          </div>
          <span className="text-xs font-semibold text-slate-300 border-r border-slate-700 pr-3 mr-1">
            متجر الرائدة للمنتجات الفاخرة
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            لوحة الأداء Dashboard
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            صندوق المحادثات (3)
          </button>
        </div>
      </div>

      {/* Tab 1: Live Dashboard Mockup */}
      {activeTab === 'dashboard' && (
        <div className="p-6 bg-slate-50 dark:bg-slate-950 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>مبيعات اليوم</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                1,200.00 <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <ArrowUpRight className="w-3 h-3" />
                <span>+14.5% عن اليوم السابق</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>صافي الربح التشغيلي</span>
                <TrendingUp className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                670.00 <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
              <div className="text-[11px] text-slate-500">
                هامش الربح: <span className="font-semibold text-slate-700 dark:text-slate-300">55.8%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>الطلبات الجديدة</span>
                <ShoppingBag className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                8 طلبات
              </div>
              <div className="text-[11px] text-emerald-600 font-medium">
                6 طلبات تم الدفع والتنفيذ
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>متوسط وقت الاستجابة</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                1.4 دقيقة
              </div>
              <div className="text-[11px] text-brand-600 font-medium">
                بمساعدة AI التلقائي
              </div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                أحدث الطلبات والعمليات المترابطة
              </h4>
              <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded">
                تحديث فوري Realtime
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                    م
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">محمد الشهري</div>
                    <div className="text-[11px] text-slate-500">ساعة ذكية فاخرة + دورة التسويق</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 dark:text-white">850.00 ر.س</div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> تم الدفع والفاتورة
                  </span>
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center">
                    س
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">سارة العتيبي</div>
                    <div className="text-[11px] text-slate-500">استشارة تطوير الأعمال (ساعة)</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 dark:text-white">300.00 ر.س</div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> بانتظار تأكيد التحويل
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Inbox Mockup */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 md:grid-cols-3 h-[420px] bg-slate-50 dark:bg-slate-950 text-xs">
          {/* Column 1: Conversations List */}
          <div className="border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث في المحادثات والعملاء..."
                className="bg-transparent text-xs w-full focus:outline-none"
                readOnly
              />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1">
              <div className="p-3 bg-brand-50/60 dark:bg-brand-950/40 border-r-2 border-brand-600 flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate">محمد الشهري</span>
                    <span className="text-[10px] text-slate-400">الآن</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                    واتساب الأعمال
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 truncate mt-1">
                    أريد طلب الساعة ودورة التسويق معاً...
                  </p>
                </div>
              </div>

              <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate">سارة العتيبي</span>
                    <span className="text-[10px] text-slate-400">قبل 12د</span>
                  </div>
                  <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.2 rounded">
                    إنستغرام DM
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 truncate mt-1">
                    كم سعر جلسة الاستشارة؟
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Chat Messages & Reply */}
          <div className="md:col-span-2 flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white">محمد الشهري (+966551234567)</h5>
                <span className="text-[10px] text-slate-500">القناة: واتساب | مسؤول الطلب: مساعد AI الذكي</span>
              </div>
              <span className="text-[11px] text-brand-600 font-semibold bg-brand-50 px-2 py-1 rounded-md flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                وضع اقتراح الرد مفعل
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-[80%]">
                  <p className="text-slate-800 dark:text-slate-200">السلام عليكم، هل الساعة الذكية متوفرة ومعها ضمان؟</p>
                  <span className="text-[9px] text-slate-400 block text-left mt-1">10:40 ص</span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-brand-600 text-white p-2.5 rounded-xl max-w-[80%]">
                  <div className="flex items-center gap-1 text-[10px] text-brand-200 mb-1 font-semibold">
                    <Sparkles className="w-3 h-3" /> تم الإنشاء بواسطة الذكاء الاصطناعي
                  </div>
                  <p>أهلاً بك أستاذ محمد! نعم الساعة متوفرة بضمان سنتين شامل، والتوصيل متاح خلال 24-48 ساعة.</p>
                  <span className="text-[9px] text-brand-200 block text-left mt-1">10:41 ص</span>
                </div>
              </div>
            </div>

            {/* Reply Input Box */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="اكتب ردك أو اختر رداً جاهزاً..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-xs focus:outline-none"
                readOnly
                value="أهلاً بك! تم تجهيز رابط الدفع وإصدار الفاتورة..."
              />
              <button className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
