'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, Menu, X, Sparkles, LogIn, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  platformName: string;
  logoUrl?: string;
}

export function LandingHeader({ platformName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              {platformName}
            </span>
            <span className="text-[10px] text-brand-600 font-semibold uppercase tracking-wider">
              منصة الأعمال الذكية
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/features" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            المميزات
          </Link>
          <Link href="/solutions" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            الحلول
          </Link>
          <Link href="/integrations" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            التكاملات
          </Link>
          <Link href="/pricing" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            الأسعار
          </Link>
          <Link href="/about" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            عن المنصة
          </Link>
          <Link href="/status" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            حالة النظام
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-700 hover:to-sky-600 rounded-lg shadow-md shadow-brand-500/20 hover:shadow-lg transition-all"
          >
            <Sparkles className="w-4 h-4" />
            ابدأ تجربتك المجانية
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="القائمة"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3">
          <Link href="/features" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            المميزات
          </Link>
          <Link href="/solutions" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            الحلول
          </Link>
          <Link href="/integrations" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            التكاملات
          </Link>
          <Link href="/pricing" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            الأسعار
          </Link>
          <Link href="/about" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            عن المنصة
          </Link>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full text-center py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/signup"
              className="w-full text-center py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg"
            >
              ابدأ تجربتك المجانية
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
