'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Phone,
  Mail,
  User,
  ChevronLeft,
  ArrowRightLeft,
  X,
  Upload,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface ContactItem {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  stage: string;
  source: string;
  totalSpent: number;
  notes?: string | null;
  createdAt: any;
  tags: any[];
}

interface ContactsClientViewProps {
  initialContacts: ContactItem[];
  currency: string;
}

export function ContactsClientView({ initialContacts, currency }: ContactsClientViewProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Modal States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);

  // Merge State
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const [merging, setMerging] = useState(false);

  // Filtered contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage = stageFilter === 'ALL' || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,الاسم,الهاتف,البريد,المرحلة,المصدر,إجمالي المشتريات\n' +
      filteredContacts
        .map((c) => `"${c.fullName}","${c.phone || ''}","${c.email || ''}","${c.stage}","${c.source}","${c.totalSpent}"`)
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `omniflow_contacts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) return;
    setImporting(true);

    try {
      const lines = importText.trim().split('\n');
      const parsedContacts = lines.map((line) => {
        const parts = line.split(',');
        return {
          fullName: parts[0]?.trim() || 'عميل مستورد',
          phone: parts[1]?.trim() || '',
          email: parts[2]?.trim() || '',
        };
      });

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsedContacts }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setImportReport(data);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleMergeSubmit = async () => {
    if (!primaryId || !secondaryId) return;
    setMerging(true);
    try {
      const res = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryContactId: primaryId, secondaryContactId: secondaryId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('تم دمج العميلين بنجاح!');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Search, Filters & Action Modals */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، رقم الهاتف، أو الإيميل..."
            className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
          >
            <option value="ALL">جميع المراحل</option>
            <option value="LEAD">محتمل (Lead)</option>
            <option value="CONTACTED">تم التواصل</option>
            <option value="CUSTOMER">عميل مؤكد (Customer)</option>
            <option value="VIP">عميل مميز (VIP)</option>
          </select>

          <button
            onClick={() => setMergeModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-brand-600" />
            <span>دمج ملفين</span>
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>تصدير</span>
          </button>
        </div>
      </div>

      {/* Contacts Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">الاسم والعميل</th>
                <th className="p-4">الهاتف والبريد</th>
                <th className="p-4">المرحلة</th>
                <th className="p-4">المصدر</th>
                <th className="p-4">إجمالي المشتريات</th>
                <th className="p-4 text-left">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center">
                          {c.fullName.substring(0, 1)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{c.fullName}</span>
                          <span className="text-[10px] text-slate-400">تاريخ التسجيل: {new Date(c.createdAt).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold block">{c.phone || 'غير مسجل'}</span>
                        <span className="text-slate-400 text-[11px] block">{c.email || ''}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {c.stage}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-600 dark:text-slate-400">{c.source}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {c.totalSpent} {currency}
                    </td>
                    <td className="p-4 text-left">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline"
                      >
                        <span>عرض الملف</span>
                        <ChevronLeft className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا يوجد عملاء مطابقين لنتائج البحث حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">استيراد عملاء عبر CSV / نص مفصول</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {importReport ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl space-y-2 text-xs font-bold text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p>تم استيراد {importReport.createdCount} عميل بنجاح!</p>
                <p className="text-[11px] text-slate-500">تم تجنب {importReport.skippedCount} سجل مكرر.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  أدخل السجلات بحيث يكون كل سطر بالصيغة: <code>الاسم, رقم الهاتف, البريد الإلكتروني</code>
                </p>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="محمد الشهري, +966551234567, m@example.com&#10;سارة العتيبي, +966509876543, s@example.com"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <button
                  onClick={handleImportSubmit}
                  disabled={importing}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>بدء الاستيراد وكشف التكرار</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Merge Contacts Modal */}
      {mergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">دمج ملفي عميلين m2m</h3>
              <button onClick={() => setMergeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">العميل الرئيسي (سيتم الاحتفاظ ببياناته)</label>
                <select
                  value={primaryId}
                  onChange={(e) => setPrimaryId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="">اختر العميل الرئيسي...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone || c.email || 'بدون هاتف'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">العميل الثانوي (سيتم دمج طلباته ومحادثاته ثم حذفه)</label>
                <select
                  value={secondaryId}
                  onChange={(e) => setSecondaryId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="">اختر العميل المكرر...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone || c.email || 'بدون هاتف'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleMergeSubmit}
                disabled={merging || !primaryId || !secondaryId}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                <span>تأكيد الدمج وتسجيل العملية في Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
