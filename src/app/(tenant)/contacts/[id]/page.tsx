import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  User,
  Phone,
  Mail,
  ShoppingBag,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  Tag,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId } = await requireWorkspaceContext();
  const { id } = await params;

  const contact = await db.contact.findFirst({
    where: { id, workspaceId },
    include: {
      channels: true,
      tags: { include: { tag: true } },
      orders: {
        include: { items: true, invoices: true },
        orderBy: { createdAt: 'desc' },
      },
      conversations: {
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 5 } },
      },
      tasks: { orderBy: { dueDate: 'asc' } },
    },
  });

  if (!contact) {
    notFound();
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  const currency = workspace?.currency || 'SAR';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/contacts"
          className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>ملف العميل: {contact.fullName}</span>
            <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-bold">
              {contact.stage}
            </span>
          </h1>
          <p className="text-xs text-slate-500">المصدر: {contact.source} | أحدث الأنشطة الموحدة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Contact Profile & Multi-channel Handles */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-14 h-14 rounded-full bg-brand-600 text-white font-extrabold text-2xl flex items-center justify-center">
                {contact.fullName.substring(0, 1)}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{contact.fullName}</h3>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> موافقة الاتصال Opt-in مؤكدة
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="font-semibold">{contact.phone || 'رقم الهاتف غير مسجل'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                <span>{contact.email || 'البريد غير مسجل'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">قنوات التواصل المرتبطة</span>
              {contact.channels.length > 0 ? (
                contact.channels.map((ch) => (
                  <div key={ch.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs flex items-center justify-between">
                    <span className="font-bold">{ch.provider}</span>
                    <span className="text-slate-500">{ch.handleId}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">واتساب / إنستغرام عبر رقم الهاتف</div>
              )}
            </div>

            {contact.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
                <span className="font-bold block">ملاحظات داخلية:</span>
                <p className="whitespace-pre-line">{contact.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Unified Timeline, Orders & Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span>سجل الطلبات والفواتير ({contact.orders.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {contact.orders.length > 0 ? (
                contact.orders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">طلب #{o.id.substring(0, 8)}</span>
                      <span className="text-slate-500 text-[11px]">
                        الحالة: {o.status} | المكونات: {o.items.length} عناصر
                      </span>
                    </div>
                    <div className="text-left font-extrabold text-slate-900 dark:text-white">
                      {o.totalAmount} {currency}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-400">لا توجد طلبات سابقة لهذا العميل.</div>
              )}
            </div>
          </div>

          {/* Unified Messages Timeline */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-600" />
              <span>السجل الزمني للمحادثات Timeline</span>
            </h3>

            <div className="space-y-3 text-xs">
              {contact.conversations.length > 0 ? (
                contact.conversations.map((conv) => (
                  <div key={conv.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>محادثة القناة #{conv.id.substring(0, 6)}</span>
                      <span className="text-brand-600 text-[10px]">{conv.status}</span>
                    </div>
                    <div className="space-y-1">
                      {conv.messages.map((m) => (
                        <div key={m.id} className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-slate-500 block text-[10px]">{m.senderType}:</span>
                          <p className="text-slate-800 dark:text-slate-200">{m.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-400">لا توجد محادثات سابقة مسجلة.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
