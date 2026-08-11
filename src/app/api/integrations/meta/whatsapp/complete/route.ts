import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { encryptIntegrationConfig } from '@/lib/integration-secrets';
import { getMetaGraphVersion, isMetaOAuthConfigured } from '@/lib/meta-integration';

const payloadSchema = z.object({
  code: z.string().min(8).max(4096),
  wabaId: z.string().min(1).max(100),
  phoneNumberId: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');
  if (!isMetaOAuthConfigured()) return NextResponse.json({ error: 'إعدادات Meta غير مكتملة.' }, { status: 503 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'بيانات الربط غير مكتملة.' }, { status: 400 });

  const tokenUrl = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
  tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
  tokenUrl.searchParams.set('code', parsed.data.code);
  const tokenResponse = await fetch(tokenUrl, { cache: 'no-store' });
  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    return NextResponse.json({ error: 'تعذر اعتماد تصريح WhatsApp لدى Meta.' }, { status: 502 });
  }

  const phoneUrl = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}/${parsed.data.phoneNumberId}`);
  phoneUrl.searchParams.set('fields', 'id,display_phone_number,verified_name');
  phoneUrl.searchParams.set('access_token', tokenPayload.access_token);
  const phoneResponse = await fetch(phoneUrl, { cache: 'no-store' });
  const phone = (await phoneResponse.json()) as { id?: string; display_phone_number?: string; verified_name?: string };
  if (!phoneResponse.ok || phone.id !== parsed.data.phoneNumberId) {
    return NextResponse.json({ error: 'لم نتمكن من التحقق من ملكية رقم WhatsApp.' }, { status: 403 });
  }

  const subscribeUrl = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}/${parsed.data.wabaId}/subscribed_apps`);
  subscribeUrl.searchParams.set('access_token', tokenPayload.access_token);
  const subscribeResponse = await fetch(subscribeUrl, { method: 'POST', cache: 'no-store' });
  if (!subscribeResponse.ok) {
    return NextResponse.json({ error: 'تم اعتماد الرقم لكن تعذر تفعيل استقبال الرسائل.' }, { status: 502 });
  }

  const settingsJson = encryptIntegrationConfig({
    accessToken: tokenPayload.access_token,
    phoneId: parsed.data.phoneNumberId,
    phoneNumberId: parsed.data.phoneNumberId,
    wabaId: parsed.data.wabaId,
    displayPhoneNumber: phone.display_phone_number || '',
    verifiedName: phone.verified_name || '',
    tokenExpiresAt: tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString() : null,
    connectedVia: 'WHATSAPP_EMBEDDED_SIGNUP',
  });
  const existing = await db.channel.findFirst({ where: { workspaceId, provider: 'WHATSAPP' } });
  const channel = existing
    ? await db.channel.update({ where: { id: existing.id }, data: { name: phone.verified_name || phone.display_phone_number || 'WhatsApp', settingsJson, isActive: true, healthStatus: 'CONNECTED' } })
    : await db.channel.create({ data: { workspaceId, provider: 'WHATSAPP', name: phone.verified_name || phone.display_phone_number || 'WhatsApp', settingsJson, isActive: true, healthStatus: 'CONNECTED' } });
  await db.auditLog.create({
    data: { workspaceId, actorId: user.id, action: 'WHATSAPP_CONNECTED_VIA_EMBEDDED_SIGNUP', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ wabaId: parsed.data.wabaId, phoneNumberId: parsed.data.phoneNumberId }) },
  });
  return NextResponse.json({ connected: true });
}
