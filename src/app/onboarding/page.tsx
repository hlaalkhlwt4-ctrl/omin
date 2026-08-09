'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, ArrowLeft, ArrowRight, CheckCircle2, Store, Laptop, UserCheck, Briefcase, GraduationCap, Calendar, Sparkles, Loader2 } from 'lucide-react';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('PHYSICAL');
  const [country, setCountry] = useState('SA');
  const [currency, setCurrency] = useState('SAR');
  const [taxRate, setTaxRate] = useState('15');
  const [firstProductTitle, setFirstProductTitle] = useState('');
  const [firstProductPrice, setFirstProductPrice] = useState('');
  const [aiInfo, setAiInfo] = useState('');

  const handleFinish = async () => {
    if (!name) {
      setError('يرجى إدخال اسم النشاط التجاري.');
      setStep(1);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          businessType,
          country,
          currency,
          taxRate,
          firstProductTitle,
          firstProductPrice,
          aiInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إكمال الإعداد.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20 mb-2">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">إعداد نشاطك التجاري الجديد</h1>
          <p className="text-xs text-slate-500">خطوات بسيطة لتجهيز منصتك بالبيانات الأولية والذكاء الاصطناعي.</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-brand-600 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Card Body */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Business Identity & Type */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                الخطوة 1 من 3: هوية ونوع النشاط
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المتجر / الشركة / النشاط *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: متجر الأفق للالكترونيات"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  نوع المجال الرئيسي
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'PHYSICAL', label: 'منتجات مادية', icon: Store },
                    { id: 'DIGITAL', label: 'منتجات رقمية', icon: Laptop },
                    { id: 'SERVICE', label: 'خدمات ومستقلين', icon: UserCheck },
                    { id: 'SUBSCRIPTION', label: 'اشتراكات دورية', icon: Briefcase },
                    { id: 'COURSE', label: 'دورات وتدريب', icon: GraduationCap },
                    { id: 'BOOKING', label: 'استشارات وحجوزات', icon: Calendar },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = businessType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBusinessType(item.id)}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-brand-600" />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                    <option value="KWD">دينار كويتي (KWD)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الضريبة %</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!name) {
                      setError('يرجى إدخال اسم النشاط.');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="px-6 py-2.5 bg-brand-600 text-white font-bold text-xs rounded-xl flex items-center gap-2"
                >
                  <span>التالي: إضافة منتج</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: First Product / Service */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                الخطوة 2 من 3: إضافة أول منتج أو خدمة (اختياري)
              </h2>

              <p className="text-xs text-slate-500">يمكنك إضافة أيتها منتجات لاحقاً من لوحة التحكم.</p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المنتج / الخدمة
                </label>
                <input
                  type="text"
                  value={firstProductTitle}
                  onChange={(e) => setFirstProductTitle(e.target.value)}
                  placeholder="مثال: ساعة ذكية مقاومة للماء"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السعر ({currency})
                </label>
                <input
                  type="number"
                  value={firstProductPrice}
                  onChange={(e) => setFirstProductPrice(e.target.value)}
                  placeholder="350"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl"
                >
                  السابق
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-brand-600 text-white font-bold text-xs rounded-xl flex items-center gap-2"
                >
                  <span>التالي: تجهيز الذكاء الاصطناعي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: AI Info & Completion */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                <span>الخطوة 3 من 3: إدخال معلومات مساعد الذكاء الاصطناعي</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نبذة عن نشاطك وساعات العمل وأوقات التوصيل
                </label>
                <textarea
                  rows={4}
                  value={aiInfo}
                  onChange={(e) => setAiInfo(e.target.value)}
                  placeholder="نحن متجر متخصص في بيع المنتجات التقنية، الشحن يستغرق 24-48 ساعة، نوفر ضمان سنتين وساعات العمل من 9 صباحاً إلى 10 مساءً."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinish}
                  className="px-8 py-3 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-700 hover:to-sky-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>إتمام الإعداد والدخول للوحة التحكم</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
