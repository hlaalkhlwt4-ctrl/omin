import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const node = process.execPath;
const prismaCli = resolve('node_modules/prisma/build/index.js');

run(node, [resolve('scripts/generate-postgres-schema.mjs')]);
run(node, [prismaCli, 'generate', '--schema=prisma/schema.prisma']);
run(
  node,
  [prismaCli, 'generate', '--schema=prisma/postgresql/schema.prisma'],
  {
    ...process.env,
    SUPABASE_DATABASE_URL:
      process.env.SUPABASE_DATABASE_URL || 'postgresql://generated:generated@localhost:5432/generated',
    SUPABASE_DIRECT_URL:
      process.env.SUPABASE_DIRECT_URL || 'postgresql://generated:generated@localhost:5432/generated',
  },
);
