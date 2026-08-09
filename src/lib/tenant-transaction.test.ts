import { describe, expect, it } from 'vitest';
import { isPostgresDatabaseUrl } from './tenant-transaction';

describe('tenant transaction database detection', () => {
  it('detects supported PostgreSQL URLs', () => {
    expect(isPostgresDatabaseUrl('postgresql://localhost/db')).toBe(true);
    expect(isPostgresDatabaseUrl('postgres://localhost/db')).toBe(true);
    expect(isPostgresDatabaseUrl('file:./dev.db')).toBe(false);
  });
});
