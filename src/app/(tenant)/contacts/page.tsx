import React from 'react';
import Link from 'next/link';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  Phone,
  Mail,
  Tag as TagIcon,
  ChevronLeft,
  ArrowRightLeft,
} from 'lucide-react';
import { ContactsClientView } from './ContactsClientView';

export default async function ContactsPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const contacts = await db.contact.findMany({
    where: { workspaceId },
    include: {
      tags: { include: { tag: true } },
      orders: { select: { id: true, totalAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>إدارة العملاء CRM</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            عرض وتصنيف واستيراد كافة ملفات العملاء المسجلين في النظام.
          </p>
        </div>
      </div>

      {/* Interactive Client View Component handling Modals, CSV, Search, Merge */}
      <ContactsClientView initialContacts={contacts} currency={workspace?.currency || 'SAR'} />
    </div>
  );
}
