import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashOneTimeToken } from '@/lib/email-verification';
import { issueSession, setSessionCookie } from '@/lib/auth';
import { getClientAddress } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const loginUrl = new URL('/login', requestUrl);

  if (!token || token.length < 32) {
    loginUrl.searchParams.set('verification', 'invalid');
    return NextResponse.redirect(loginUrl);
  }

  const verification = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashOneTimeToken(token) },
    include: { user: true },
  });

  if (!verification || verification.usedAt || verification.expiresAt <= new Date()) {
    loginUrl.searchParams.set('verification', 'expired');
    return NextResponse.redirect(loginUrl);
  }

  const pendingInvitations = await db.workspaceInvitation.findMany({
    where: {
      email: verification.user.email.toLowerCase(),
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  await db.$transaction([
    db.user.update({ where: { id: verification.userId }, data: { emailVerified: true } }),
    db.emailVerificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
    ...pendingInvitations.map((invitation) => db.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: verification.userId,
        },
      },
      update: { status: 'ACTIVE', role: invitation.role, joinedAt: new Date() },
      create: {
        workspaceId: invitation.workspaceId,
        userId: verification.userId,
        role: invitation.role,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    })),
    ...pendingInvitations.map((invitation) => db.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    })),
  ]);

  const tokenValue = await issueSession(
    {
      userId: verification.user.id,
      email: verification.user.email,
      isSuperAdmin: verification.user.isSuperAdmin,
      activeWorkspaceId: pendingInvitations[0]?.workspaceId,
    },
    {
      ipAddress: getClientAddress(request),
      userAgent: request.headers.get('user-agent') || undefined,
    },
  );
  const destination = new URL(pendingInvitations.length > 0 ? '/dashboard' : '/onboarding', requestUrl);
  destination.searchParams.set('verified', '1');
  const response = NextResponse.redirect(destination);
  setSessionCookie(response, tokenValue);
  return response;
}
