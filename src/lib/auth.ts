import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { cookies } from 'next/headers';
import { createHash, randomUUID } from 'crypto';
import type { NextResponse } from 'next/server';
import { AppError } from './errors';

const SESSION_COOKIE = 'omniflow_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export interface UserSessionPayload {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  activeWorkspaceId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError(
      'AUTH_MISCONFIGURED',
      503,
      'المصادقة غير مهيأة: يجب ضبط JWT_SECRET عشوائي بطول 32 حرفًا على الأقل.',
    );
  }
  return secret;
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function signToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', jwtid: randomUUID() });
}

export function verifyToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as UserSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const persistedSession = await db.session.findUnique({
    where: { token: hashSessionToken(token) },
  });
  if (
    !persistedSession ||
    persistedSession.userId !== payload.userId ||
    persistedSession.expiresAt <= new Date()
  ) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: {
      memberships: {
        include: { workspace: true },
      },
    },
  });

  if (!user || user.status === 'SUSPENDED') return null;

  const activeWorkspaceId =
    payload.activeWorkspaceId &&
    user.memberships.some((m) => m.workspaceId === payload.activeWorkspaceId)
      ? payload.activeWorkspaceId
      : user.memberships[0]?.workspaceId;

  return {
    ...user,
    activeWorkspaceId,
    activeMembership: user.memberships.find((m) => m.workspaceId === activeWorkspaceId),
  };
}

export async function requireAuthContext() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError('UNAUTHORIZED', 401, 'يجب تسجيل الدخول للمتابعة.');
  }
  return user;
}

export async function requireWorkspaceContext() {
  const user = await requireAuthContext();
  if (!user.activeWorkspaceId || !user.activeMembership) {
    throw new AppError('NO_ACTIVE_WORKSPACE', 409, 'لا يوجد نشاط تجاري نشط لهذا الحساب.');
  }
  if (user.activeMembership.workspace.status === 'SUSPENDED') {
    throw new AppError('WORKSPACE_SUSPENDED', 403, 'هذا النشاط موقوف حاليًا. تواصل مع دعم المنصة.');
  }
  return {
    user,
    workspaceId: user.activeWorkspaceId,
    membership: user.activeMembership,
    role: user.activeMembership.role,
    workspaceStatus: user.activeMembership.workspace.status,
  };
}

export async function requireWritableWorkspaceContext() {
  const context = await requireWorkspaceContext();
  if (context.workspaceStatus === 'READ_ONLY') {
    throw new AppError('WORKSPACE_READ_ONLY', 403, 'النشاط في وضع القراءة فقط ولا يقبل تعديلات حاليًا.');
  }
  return context;
}

export async function issueSession(
  payload: UserSessionPayload,
  metadata?: { ipAddress?: string; userAgent?: string },
) {
  const token = signToken(payload);
  await db.session.create({
    data: {
      userId: payload.userId,
      token: hashSessionToken(token),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000),
    },
  });
  return token;
}

export async function revokeSession(token?: string) {
  const currentToken = token || (await cookies()).get(SESSION_COOKIE)?.value;
  if (!currentToken) return;
  await db.session.deleteMany({ where: { token: hashSessionToken(currentToken) } });
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
