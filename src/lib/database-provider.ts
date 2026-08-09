export type DatabaseProvider = 'sqlite' | 'supabase';

export function isPostgresUrl(value: string) {
  return value.startsWith('postgresql://') || value.startsWith('postgres://');
}

export function getDatabaseProvider(
  supabaseUrl = process.env.SUPABASE_DATABASE_URL?.trim() || '',
): DatabaseProvider {
  if (!supabaseUrl) return 'sqlite';
  if (!isPostgresUrl(supabaseUrl)) {
    throw new Error(
      'SUPABASE_DATABASE_URL must start with postgres:// or postgresql://. Refusing to silently fall back to SQLite.',
    );
  }
  return 'supabase';
}

export function getRuntimeDatabaseUrl() {
  return process.env.SUPABASE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || '';
}
