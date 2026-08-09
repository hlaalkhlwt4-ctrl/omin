import pg from 'pg';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;
if (!databaseUrl?.startsWith('postgres')) {
  throw new Error('اضبط POSTGRES_TEST_DATABASE_URL على قاعدة اختبار PostgreSQL معزولة.');
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const userA = randomUUID();
const userB = randomUUID();
const workspaceA = randomUUID();
const workspaceB = randomUUID();

try {
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.is_super_admin', 'true', true)");
  await client.query(`INSERT INTO "User" (id,email,"passwordHash","fullName","updatedAt") VALUES ($1,$2,'test','A',now()),($3,$4,'test','B',now())`, [userA, `${userA}@test.invalid`, userB, `${userB}@test.invalid`]);
  await client.query(`INSERT INTO "Workspace" (id,name,slug,"updatedAt") VALUES ($1,'A',$2,now()),($3,'B',$4,now())`, [workspaceA, `a-${workspaceA}`, workspaceB, `b-${workspaceB}`]);
  await client.query(`INSERT INTO "WorkspaceMember" (id,"workspaceId","userId",role,status) VALUES ($1,$2,$3,'OWNER','ACTIVE'),($4,$5,$6,'OWNER','ACTIVE')`, [randomUUID(), workspaceA, userA, randomUUID(), workspaceB, userB]);
  await client.query(`INSERT INTO "Contact" (id,"workspaceId","fullName","updatedAt") VALUES ($1,$2,'Contact A',now()),($3,$4,'Contact B',now())`, [randomUUID(), workspaceA, randomUUID(), workspaceB]);

  await client.query("SELECT set_config('app.is_super_admin', 'false', true)");
  await client.query(`SELECT set_config('app.user_id', $1, true)`, [userA]);
  const visibleToA = await client.query(`SELECT "workspaceId" FROM "Contact" ORDER BY "workspaceId"`);
  if (visibleToA.rows.length !== 1 || visibleToA.rows[0].workspaceId !== workspaceA) {
    throw new Error('RLS isolation failed for workspace A.');
  }

  await client.query(`SELECT set_config('app.user_id', $1, true)`, [userB]);
  const visibleToB = await client.query(`SELECT "workspaceId" FROM "Contact" ORDER BY "workspaceId"`);
  if (visibleToB.rows.length !== 1 || visibleToB.rows[0].workspaceId !== workspaceB) {
    throw new Error('RLS isolation failed for workspace B.');
  }
  console.log('PostgreSQL RLS isolation test passed for workspace A/B.');
} finally {
  await client.query('ROLLBACK').catch(() => undefined);
  await client.end();
}
