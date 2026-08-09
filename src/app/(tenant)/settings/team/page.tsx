import { db } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { PageHeader } from '@/components/app/PageHeader';
import { TeamClient } from './TeamClient';

export default async function TeamSettingsPage() {
  const { workspaceId, user, role } = await requireWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'team:manage');
  const [memberships, invitations] = await Promise.all([
    db.workspaceMember.findMany({ where: { workspaceId }, include: { user: true }, orderBy: { invitedAt: 'asc' } }),
    db.workspaceInvitation.findMany({ where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } }),
  ]);
  return <div className="space-y-7 pb-12">
    <PageHeader title="الفريق والصلاحيات" description="ادعُ أعضاء الفريق، حدّد أدوارهم، وأوقف العضوية دون حذف سجلها التاريخي." />
    <TeamClient
      members={memberships.map((membership) => ({ id: membership.id, fullName: membership.user.fullName, email: membership.user.email, role: membership.role, status: membership.status, isCurrentUser: membership.userId === user.id }))}
      invitations={invitations.map((invitation) => ({ id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt.toISOString() }))}
    />
  </div>;
}
