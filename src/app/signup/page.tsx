'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, UserPlus, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<{ previewUrl?: string; emailSent: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إنشاء الحساب. حاول بريداً آخر.');
      }

      setVerification({
        previewUrl: data.verificationPreviewUrl,
        emailSent: Boolean(data.emailSent),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Layers className="w-6 h-6" />
          </div>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">إنشاء حساب جديد مجاناً</h2>
        <p className="text-xs text-slate-500">تجربة مجانية لمدة 14 يوماً بكافة الميزات ودون الحاجة لبطاقة ائتمان.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl border border-slate-200 dark:border-slate-800 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {verification ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">بقي تأكيد بريدك الإلكتروني</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {verification.emailSent
                    ? 'أرسلنا رابط التأكيد إلى بريدك. افتحه خلال 24 ساعة لإكمال إنشاء النشاط.'
                    : 'خدمة البريد غير مهيأة في بيئة التطوير. استخدم رابط المعاينة الآمن أدناه.'}
                </p>
              </div>
              {verification.previewUrl && (
                <a href={verification.previewUrl} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white">
                  <ExternalLink className="h-4 w-4" /> تأكيد البريد في بيئة التطوير
                </a>
              )}
              <Link href="/login" className="block text-xs font-bold text-brand-600">العودة إلى تسجيل الدخول</Link>
            </div>
          ) : <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم الكامل
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="عبدالله محمد"
                  className="w-full pl-3 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-3 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور (8 خانات على الأقل)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="terms" className="text-slate-600 dark:text-slate-400 leading-tight">
                أوافق على <Link href="/terms" className="text-brand-600 underline">شروط الاستخدام</Link> و <Link href="/privacy" className="text-brand-600 underline">سياسة الخصوصية</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء الحساب والبدء</span>
                </>
              )}
            </button>
          </form>}

          {!verification && <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="font-bold text-brand-600 hover:underline">
              سجل الدخول هنا
            </Link>
          </div>}
        </div>
      </div>
    </div>
  );
}
