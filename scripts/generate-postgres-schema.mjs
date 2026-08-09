import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve('prisma/schema.prisma');
const targetPath = resolve('prisma/postgresql/schema.prisma');
const source = await readFile(sourcePath, 'utf8');
const withPostgresDatasource = source.replace(
  /datasource db \{\s*provider\s*=\s*"sqlite"/m,
  'datasource db {\n  provider  = "postgresql"',
);

if (withPostgresDatasource === source) {
  throw new Error('تعذر العثور على datasource SQLite في مخطط Prisma.');
}

const withSupabaseUrls = withPostgresDatasource.replace(
  /\s+url\s*=\s*env\("DATABASE_URL"\)/m,
  '\n  url        = env("SUPABASE_DATABASE_URL")\n  directUrl  = env("SUPABASE_DIRECT_URL")',
);

const postgresSchema = withSupabaseUrls.replace(
  /generator client \{\s*provider\s*=\s*"prisma-client-js"\s*\}/m,
  'generator client {\n  provider = "prisma-client-js"\n  output   = "../../node_modules/@omniflow/prisma-postgresql-client"\n}',
);

if (postgresSchema === withSupabaseUrls) {
  throw new Error('تعذر ضبط مسار عميل Prisma الخاص بـ PostgreSQL.');
}

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, `// Generated from prisma/schema.prisma. Do not edit manually.\n${postgresSchema}`, 'utf8');
console.log(`Generated ${targetPath}`);
