import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const email = `e2e-${nonce}@localhost.invalid`;
const password = `Smoke-${randomBytes(16).toString('base64url')}Aa1!`;
const workspaceName = `E2E Workspace ${nonce}`;
const db = new PrismaClient();
let userId;
let workspaceId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'مستخدم فحص مؤقت', email, password }),
  });
  const signupBody = await signup.json();
  assert(signup.status === 201, `signup failed: ${signup.status} ${JSON.stringify(signupBody)}`);
  userId = signupBody.userId;
  assert(signupBody.verificationPreviewUrl, 'development signup did not return a verification preview URL');
  const verificationUrl = new URL(signupBody.verificationPreviewUrl);
  verificationUrl.host = new URL(baseUrl).host;
  verificationUrl.protocol = new URL(baseUrl).protocol;
  const verification = await fetch(verificationUrl, { redirect: 'manual' });
  assert(verification.status >= 300 && verification.status < 400, `verification failed: ${verification.status}`);
  let cookie = verification.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'verification did not return a session cookie');

  const workspace = await fetch(`${baseUrl}/api/workspace/create`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: workspaceName, businessType: 'SERVICE', country: 'SA', currency: 'SAR', timezone: 'Asia/Riyadh', taxRate: 15 }),
  });
  const workspaceBody = await workspace.json();
  assert(workspace.ok, `workspace failed: ${workspace.status} ${JSON.stringify(workspaceBody)}`);
  workspaceId = workspaceBody.workspaceId;
  cookie = workspace.headers.get('set-cookie')?.split(';')[0] || cookie;

  const dashboard = await fetch(`${baseUrl}/dashboard`, { headers: { Cookie: cookie } });
  const dashboardHtml = await dashboard.text();
  assert(dashboard.ok, `dashboard failed: ${dashboard.status}`);
  assert(dashboardHtml.includes(workspaceName), 'dashboard did not render the active workspace');

  const unauthorized = await fetch(`${baseUrl}/api/inbox/messages?conversationId=invalid`);
  assert(unauthorized.status === 401, `unauthorized API returned ${unauthorized.status}`);
  console.log(JSON.stringify({ ok: true, signup: signup.status, workspace: workspace.status, dashboard: dashboard.status, unauthorized: unauthorized.status }));
} finally {
  if (workspaceId) await db.workspace.deleteMany({ where: { id: workspaceId } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
}
