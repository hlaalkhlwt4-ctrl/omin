import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  Layers,
  LayoutDashboard,
  Users,
  ShoppingBag,
  MessageSquare,
  FileText,
  DollarSign,
  Zap,
  Bot,
  Sliders,
  BarChart3,
  Shield,
  LogOut,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  CheckCircle2,
  Menu,
  ListTodo,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';
import { hasPermission, type PermissionAction, type WorkspaceRole } from '@/lib/permissions';
import { WorkspaceSwitcher } from '@/components/app/WorkspaceSwitcher';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // If user has no active workspace, send to onboarding
  if (!user.activeWorkspaceId) {
    redirect('/onboarding');
  }

  const workspace = await db.workspace.findUnique({
    where: { id: user.activeWorkspaceId },
  });

  if (!workspace) {
    redirect('/onboarding');
  }

  const announcements = await db.announcement.findMany({
    where: { isPublished: true, audience: { in: ['ALL', 'ACTIVE'] } },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  });

  const currentRole = user.activeMembership?.role as WorkspaceRole;
  const can = (permission: PermissionAction) => hasPermission(currentRole, permission);
  const mobileLinks = [
    { href: '/dashboard', label: 'لوحة الأداء' },
    { href: '/inbox', label: 'المحادثات', permission: 'inbox:view' as PermissionAction },
    { href: '/contacts', label: 'العملاء', permission: 'contacts:view' as PermissionAction },
    { href: '/products', label: 'المنتجات', permission: 'orders:view' as PermissionAction },
    { href: '/orders', label: 'الطلبات', permission: 'orders:view' as PermissionAction },
    { href: '/tasks', label: 'المهام', permission: 'tasks:view' as PermissionAction },
    { href: '/invoices', label: 'المالية', permission: 'finance:view' as PermissionAction },
    { href: '/campaigns', label: 'الحملات', permission: 'campaigns:manage' as PermissionAction },
    { href: '/automations', label: 'الأتمتة', permission: 'automations:manage' as PermissionAction },
    { href: '/settings/integrations', label: 'التكاملات', permission: 'settings:manage' as PermissionAction },
    { href: '/settings/team', label: 'الفريق', permission: 'team:manage' as PermissionAction },
    { href: '/settings/business', label: 'بيانات المنشأة', permission: 'settings:manage' as PermissionAction },
    { href: '/settings/billing', label: 'الاشتراك والفوترة', permission: 'settings:manage' as PermissionAction },
    { href: '/settings/support', label: 'الدعم الفني' },
  ].filter((item) => !item.permission || can(item.permission));

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 border-l border-slate-800 flex flex-col shrink-0 hidden md:flex">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white block tracking-tight">
                {workspace.name}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block">
                {workspace.businessType} | {workspace.currency}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto text-xs font-semibold">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <LayoutDashboard className="w-4 h-4 text-brand-400" />
            <span>لوحة الأداء Dashboard</span>
          </Link>

          <Link
            href="/inbox"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>صندوق المحادثات Inbox</span>
            </div>
            <span className="bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              نشط
            </span>
          </Link>

          <Link
            href="/contacts"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>إدارة العملاء CRM</span>
          </Link>

          <Link
            href="/products"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>المنتجات والخدمات</span>
          </Link>

          <Link
            href="/orders"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>مسار الطلبات Pipeline</span>
          </Link>

          {can('tasks:view') && <Link href="/tasks" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"><ListTodo className="w-4 h-4 text-cyan-400" /><span>المهام والمتابعات</span></Link>}

          {can('finance:view') && <Link
            href="/invoices"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>الفواتير والمدفوعات</span>
          </Link>}

          {can('finance:view') && <Link
            href="/expenses"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <DollarSign className="w-4 h-4 text-rose-400" />
            <span>المصاريف والأرباح</span>
          </Link>}

          {can('campaigns:manage') && <Link
            href="/campaigns"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>الحملات التسويقية</span>
          </Link>}

          {can('automations:manage') && <Link
            href="/automations"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>محرك الأتمتة</span>
          </Link>}

          {can('inbox:manage_ai') && <Link
            href="/settings/ai"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>مساعد الذكاء الاصطناعي</span>
          </Link>}

          {can('settings:manage') && <Link
            href="/settings/integrations"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>التكاملات والقنوات</span>
          </Link>}

          {can('team:manage') && <Link
            href="/settings/team"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>الفريق والصلاحيات</span>
          </Link>}

          {can('settings:manage') && <Link href="/settings/business" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"><FileText className="w-4 h-4 text-emerald-400" /><span>بيانات المنشأة والفوترة</span></Link>}

          {can('settings:manage') && <Link href="/settings/billing" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"><CreditCard className="w-4 h-4 text-amber-400" /><span>الاشتراك والباقات</span></Link>}

          <Link href="/settings/support" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"><LifeBuoy className="w-4 h-4 text-rose-400" /><span>الدعم الفني</span></Link>

          {can('finance:view') && <Link
            href="/reports"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <span>التقارير التحليلية</span>
          </Link>}

          {user.isSuperAdmin && (
            <div className="pt-4 border-t border-slate-800 mt-4">
              <Link
                href="/admin"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-bold transition-all"
              >
                <Shield className="w-4 h-4" />
                <span>لوحة Super Admin</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0">
              {user.fullName.substring(0, 1)}
            </div>
            <div className="truncate">
              <span className="font-bold text-white block truncate">{user.fullName}</span>
              <span className="text-[10px] text-slate-400 block truncate">{user.email}</span>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-slate-900 dark:text-white text-base">
              {workspace.name}
            </span>
            <WorkspaceSwitcher
              activeWorkspaceId={workspace.id}
              workspaces={user.memberships
                .filter((membership) => membership.status === 'ACTIVE' && membership.workspace.status !== 'SUSPENDED')
                .map((membership) => ({ id: membership.workspaceId, name: membership.workspace.name }))}
            />
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-semibold">
              اشتراك نشط Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <details className="relative md:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700">
                <Menu className="h-4 w-4" /> القائمة
              </summary>
              <nav className="absolute left-0 top-12 z-50 grid min-w-52 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {mobileLinks.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">{item.label}</Link>)}
              </nav>
            </details>
            <details className="relative">
              <summary aria-label="إعلانات المنصة" className="relative cursor-pointer list-none rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <Bell className="h-5 w-5" />
                {announcements.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />}
              </summary>
              <div className="absolute left-0 top-11 z-50 w-80 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-right shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-bold">إعلانات المنصة</p>
                {announcements.length === 0 ? <p className="text-xs text-slate-500">لا توجد إعلانات جديدة.</p> : announcements.map((announcement) => <div key={announcement.id} className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><b>{announcement.title}</b><p className="mt-1 leading-5 text-slate-500">{announcement.body}</p></div>)}
              </div>
            </details>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
