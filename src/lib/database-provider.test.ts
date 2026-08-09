import { describe, expect, it } from 'vitest';
import { getDatabaseProvider, isPostgresUrl } from './database-provider';

describe('database provider selection', () => {
  it('keeps SQLite when Supabase is not configured', () => {
    expect(getDatabaseProvider('')).toBe('sqlite');
  });

  it('selects Supabase for PostgreSQL URLs', () => {
    expect(getDatabaseProvider('postgresql://user:pass@host/db')).toBe('supabase');
    expect(isPostgresUrl('postgres://user:pass@host/db')).toBe(true);
  });

  it('does not silently ignore a malformed Supabase URL', () => {
    expect(() => getDatabaseProvider('https://example.supabase.co')).toThrow(/SUPABASE_DATABASE_URL/);
  });
});
