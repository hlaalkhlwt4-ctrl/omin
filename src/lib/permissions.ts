export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'SALES' | 'SUPPORT' | 'ACCOUNTANT' | 'VIEWER';

export type PermissionAction =
  | 'contacts:view'
  | 'contacts:create'
  | 'contacts:update'
  | 'contacts:delete'
  | 'inbox:view'
  | 'inbox:reply'
  | 'inbox:assign'
  | 'inbox:manage_ai'
  | 'orders:view'
  | 'orders:create'
  | 'orders:update'
  | 'orders:delete'
  | 'tasks:view'
  | 'tasks:manage'
  | 'finance:view'
  | 'finance:manage'
  | 'campaigns:manage'
  | 'automations:manage'
  | 'team:manage'
  | 'settings:manage';

const ROLE_PERMISSIONS_MAP: Record<WorkspaceRole, PermissionAction[]> = {
  OWNER: [
    'contacts:view', 'contacts:create', 'contacts:update', 'contacts:delete',
    'inbox:view', 'inbox:reply', 'inbox:assign', 'inbox:manage_ai',
    'orders:view', 'orders:create', 'orders:update', 'orders:delete',
    'tasks:view', 'tasks:manage',
    'finance:view', 'finance:manage',
    'campaigns:manage', 'automations:manage', 'team:manage', 'settings:manage',
  ],
  ADMIN: [
    'contacts:view', 'contacts:create', 'contacts:update', 'contacts:delete',
    'inbox:view', 'inbox:reply', 'inbox:assign', 'inbox:manage_ai',
    'orders:view', 'orders:create', 'orders:update', 'orders:delete',
    'tasks:view', 'tasks:manage',
    'finance:view', 'finance:manage',
    'campaigns:manage', 'automations:manage', 'team:manage', 'settings:manage',
  ],
  SALES: [
    'contacts:view', 'contacts:create', 'contacts:update',
    'inbox:view', 'inbox:reply',
    'orders:view', 'orders:create', 'orders:update',
    'tasks:view', 'tasks:manage',
  ],
  SUPPORT: [
    'contacts:view', 'contacts:update',
    'inbox:view', 'inbox:reply', 'inbox:assign',
    'tasks:view', 'tasks:manage',
  ],
  ACCOUNTANT: [
    'contacts:view',
    'orders:view',
    'finance:view', 'finance:manage',
    'tasks:view',
  ],
  VIEWER: [
    'contacts:view',
    'inbox:view',
    'orders:view',
    'tasks:view',
  ],
};

export function hasPermission(role: WorkspaceRole, action: PermissionAction): boolean {
  const allowed = ROLE_PERMISSIONS_MAP[role] || [];
  return allowed.includes(action);
}

export function enforcePermission(role: WorkspaceRole, action: PermissionAction) {
  if (!hasPermission(role, action)) {
    throw new AppError('FORBIDDEN_PERMISSION', 403, 'ليست لديك صلاحية لتنفيذ هذا الإجراء.');
  }
}
import { AppError } from './errors';
