import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function requirePostgresUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`اضبط ${name} في ملف .env أولًا.`);

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} ليس رابط اتصال صالحًا.`);
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${name} يجب أن يبدأ بـ postgres:// أو postgresql://.`);
  }

  if (!parsed.searchParams.has('sslmode')) {
    console.warn(`تنبيه: يفضّل أن يحتوي ${name} على sslmode=require.`);
  }
}

requirePostgresUrl('SUPABASE_DATABASE_URL');
requirePostgresUrl('SUPABASE_DIRECT_URL');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const node = process.execPath;
const prismaCli = resolve('node_modules/prisma/build/index.js');

run(node, [resolve('scripts/generate-prisma-clients.mjs')]);
run(node, [prismaCli, 'db', 'push', '--schema=prisma/postgresql/schema.prisma']);
run(node, [resolve('scripts/test-supabase-connection.mjs')]);

console.log('Supabase is connected and the OmniFlow schema is ready.');
