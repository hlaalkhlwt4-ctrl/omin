import { PrismaClient as SqlitePrismaClient } from '@prisma/client';
import { PrismaClient as SupabasePrismaClient } from '@omniflow/prisma-postgresql-client';
import { getDatabaseProvider, getRuntimeDatabaseUrl } from './database-provider';

const globalForPrisma = globalThis as unknown as {
  prisma: SqlitePrismaClient | undefined;
};

function getSupabaseClientUrl() {
  const url = new URL(getRuntimeDatabaseUrl());

  if (url.hostname.endsWith('.pooler.supabase.com')) {
    // Application traffic must use Supavisor transaction mode. Session mode
    // limits this project to 15 clients and is reserved for direct/admin work.
    if (url.port === '5432') url.port = '6543';
    url.searchParams.set('pgbouncer', 'true');
  }

  // A single Next.js build can evaluate multiple workers. Keep every Prisma
  // pool deliberately small so those workers cannot exhaust Supabase.
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
  return url.toString();
}

function createPrismaClient(): SqlitePrismaClient {
  const log: Array<'query' | 'error' | 'warn'> =
    process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];
  const options = {
    log,
  };

  if (getDatabaseProvider() === 'supabase') {
    return new SupabasePrismaClient({
      ...options,
      datasources: { db: { url: getSupabaseClientUrl() } },
    }) as unknown as SqlitePrismaClient;
  }

  return new SqlitePrismaClient(options);
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

// Next.js can evaluate separate route bundles in the same Node.js process.
// Reuse one Prisma client in every environment so those bundles do not each
// open their own connection pool and exhaust Supabase's session-pool limit.
globalForPrisma.prisma = db;
