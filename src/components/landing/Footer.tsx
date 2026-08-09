import React from 'react';
import Link from 'next/link';
import { Layers, Mail, Phone, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  platformName: string;
  contactEmail: string;
  supportPhone: string;
}

export function LandingFooter({ platformName, contactEmail, supportPhone }: FooterProps) {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                {platformName}
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              المنصة العربية الشاملة لإدارة العملاء، صندوق المحادثات الموحد، الطلبات، الفواتير، المصاريف، الأتمتة والذكاء الاصطناعي لكل نشاط تجاري يعمل أونلاين.
            </p>
            <div className="flex flex-col gap-2 pt-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-brand-400" />
                <span>{contactEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-brand-400" />
                <span>{supportPhone}</span>
              </div>
            </div>
          </div>

          {/* Column 1: Products & Features */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">المنتج والحلول</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/features#crm" className="hover:text-white transition-colors">إدارة العملاء CRM</Link></li>
              <li><Link href="/features#inbox" className="hover:text-white transition-colors">صندوق المحادثات الموحد</Link></li>
              <li><Link href="/features#orders" className="hover:text-white transition-colors">مسار الطلبات والمبيعات</Link></li>
              <li><Link href="/features#invoices" className="hover:text-white transition-colors">الفواتير الضريبية والمصاريف</Link></li>
              <li><Link href="/features#automations" className="hover:text-white transition-colors">محرك الأتمتة</Link></li>
              <li><Link href="/features#ai" className="hover:text-white transition-colors">مساعد الذكاء الاصطناعي</Link></li>
            </ul>
          </div>

          {/* Column 2: Industries */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">أنواع الأنشطة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/solutions#physical" className="hover:text-white transition-colors">المتاجر المادية</Link></li>
              <li><Link href="/solutions#digital" className="hover:text-white transition-colors">المنتجات الرقمية والاشتراكات</Link></li>
              <li><Link href="/solutions#services" className="hover:text-white transition-colors">المستقلون والخدمات</Link></li>
              <li><Link href="/solutions#agencies" className="hover:text-white transition-colors">الوكالات وشركات التسويق</Link></li>
              <li><Link href="/solutions#courses" className="hover:text-white transition-colors">المدربون والدورات</Link></li>
              <li><Link href="/solutions#bookings" className="hover:text-white transition-colors">الحجوزات والاستشارات</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">الشركة والدعم</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">عن المنصة</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">الأسعار والباقات</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">التكاملات المتاحة</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">تواصل معنا</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">سياسة الاسترجاع والإلغاء</Link></li>
              <li><Link href="/status" className="hover:text-white transition-colors flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                حالة النظام والتوافر
              </Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {platformName}. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-1">
            <span>صُنع بشغف للأعمال العربية</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
