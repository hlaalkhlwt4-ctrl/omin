import { PrismaClient as SqlitePrismaClient } from '@prisma/client';
import { PrismaClient as SupabasePrismaClient } from '@omniflow/prisma-postgresql-client';
import { getDatabaseProvider } from './database-provider';

const globalForPrisma = globalThis as unknown as {
  prisma: SqlitePrismaClient | undefined;
};

function createPrismaClient(): SqlitePrismaClient {
  const log: Array<'query' | 'error' | 'warn'> =
    process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];
  const options = {
    log,
  };

  if (getDatabaseProvider() === 'supabase') {
    return new SupabasePrismaClient(options) as unknown as SqlitePrismaClient;
  }

  return new SqlitePrismaClient(options);
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
