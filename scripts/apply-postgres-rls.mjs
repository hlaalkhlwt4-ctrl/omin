import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const databaseUrl =
  process.env.SUPABASE_DIRECT_URL || process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('postgres')) {
  throw new Error('اضبط POSTGRES_DATABASE_URL على قاعدة PostgreSQL قبل تطبيق RLS.');
}

const sql = await readFile(resolve('prisma/postgresql/rls.sql'), 'utf8');
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query(sql);
  await client.query('COMMIT');
  console.log('PostgreSQL RLS policies applied successfully.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
