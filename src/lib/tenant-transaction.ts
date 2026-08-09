import type { Prisma } from '@prisma/client';
import { db } from './db';
import { getRuntimeDatabaseUrl, isPostgresUrl } from './database-provider';

export function isPostgresDatabaseUrl(value = getRuntimeDatabaseUrl()) {
  return isPostgresUrl(value);
}

export async function withTenantTransaction<T>(
  context: { userId: string; workspaceId: string; isSuperAdmin?: boolean },
  operation: (tenantDb: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(async (tenantDb) => {
    if (isPostgresDatabaseUrl()) {
      await tenantDb.$executeRaw`SELECT set_config('app.user_id', ${context.userId}, true)`;
      await tenantDb.$executeRaw`SELECT set_config('app.is_super_admin', ${context.isSuperAdmin ? 'true' : 'false'}, true)`;
    }
    return operation(tenantDb);
  });
}
