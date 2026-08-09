import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.SUPABASE_DATABASE_URL?.startsWith('postgres')) {
  throw new Error('اضبط SUPABASE_DATABASE_URL قبل تأمين قاعدة Supabase.');
}

const { PrismaClient } = await import('@omniflow/prisma-postgresql-client');
const prisma = new PrismaClient();

try {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role',
    );
    await transaction.$executeRawUnsafe(
      'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role',
    );
    await transaction.$executeRawUnsafe(
      'REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated, service_role',
    );
    await transaction.$executeRawUnsafe(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role',
    );
    await transaction.$executeRawUnsafe(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role',
    );
    await transaction.$executeRawUnsafe(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM anon, authenticated, service_role',
    );
  });

  const remaining = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated', 'service_role')
  `);
  console.log(`Supabase Data API table grants remaining: ${remaining[0]?.count ?? 0}`);
} finally {
  await prisma.$disconnect();
}
