import { NextResponse } from 'next/server';
import { clearSessionCookie, revokeSession } from '@/lib/auth';

export async function POST() {
  await revokeSession();
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
