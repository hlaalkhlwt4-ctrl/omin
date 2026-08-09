import React from 'react';
import { getPlatformBranding } from '@/lib/branding';
import { LandingHeader } from '@/components/landing/Header';
import { LandingFooter } from '@/components/landing/Footer';
import { Mail, Phone, MapPin } from 'lucide-react';

export default async function ContactPage() {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <LandingHeader platformName={branding.platformName} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">تواصل مع فريق {branding.platformName}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">نحن هنا للإجابة على استفساراتك وتوفير الدعم الفني اللازم.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-brand-600" />
              <div>
                <span className="font-bold block text-slate-900 dark:text-white">البريد الإلكتروني</span>
                <span className="text-slate-500">{branding.contactEmail}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-brand-600" />
              <div>
                <span className="font-bold block text-slate-900 dark:text-white">الهاتف والواتساب</span>
                <span className="text-slate-500">{branding.supportPhone}</span>
              </div>
            </div>
          </div>

          <form className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div>
              <label className="font-bold block text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل</label>
              <input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" placeholder="أدخل اسمك" required />
            </div>
            <div>
              <label className="font-bold block text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
              <input type="email" className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" placeholder="name@domain.com" required />
            </div>
            <div>
              <label className="font-bold block text-slate-700 dark:text-slate-300 mb-1">الرسالة</label>
              <textarea rows={4} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" placeholder="كيف يمكننا مساعدتك؟" required />
            </div>
            <button type="submit" className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700">
              إرسال الرسالة
            </button>
          </form>
        </div>
      </main>
      <LandingFooter platformName={branding.platformName} contactEmail={branding.contactEmail} supportPhone={branding.supportPhone} />
    </div>
  );
}
