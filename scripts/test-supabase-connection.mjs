import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error('اضبط SUPABASE_DATABASE_URL في ملف .env أولًا.');
}

const { PrismaClient } = await import('@omniflow/prisma-postgresql-client');
const prisma = new PrismaClient();

try {
  await prisma.$queryRawUnsafe('SELECT 1');
  const tableCount = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  console.log(`Supabase connection OK. Public tables: ${tableCount[0]?.count ?? 0}`);
} finally {
  await prisma.$disconnect();
}
