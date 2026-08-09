import { describe, expect, it } from 'vitest';
import { enforcePermission, hasPermission } from './permissions';

describe('workspace permissions', () => {
  it('allows owners to manage settings', () => expect(hasPermission('OWNER', 'settings:manage')).toBe(true));
  it('prevents support from reading financial data', () => expect(hasPermission('SUPPORT', 'finance:view')).toBe(false));
  it('allows support to manage follow-up tasks', () => expect(hasPermission('SUPPORT', 'tasks:manage')).toBe(true));
  it('keeps viewers read-only', () => {
    expect(hasPermission('VIEWER', 'contacts:view')).toBe(true);
    expect(hasPermission('VIEWER', 'contacts:update')).toBe(false);
    expect(() => enforcePermission('VIEWER', 'orders:create')).toThrow('ليست لديك صلاحية');
  });
});
