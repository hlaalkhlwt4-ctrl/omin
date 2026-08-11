import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { encryptIntegrationConfig } from '@/lib/integration-secrets';
import {
  getMetaGraphVersion,
  getMetaRedirectUri,
  integrationSettingsUrl,
  type MetaProvider,
} from '@/lib/meta-integration';

type TokenResponse = { access_token?: string; expires_in?: number; error?: { message?: string } };
type Page = {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: { id: string };
};

function finish(response: NextResponse) {
  for (const name of ['meta_oauth_state', 'meta_oauth_provider']) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/integrations/meta/callback',
      expires: new Date(0),
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const { user, workspaceId, role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');

  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get('meta_oauth_state')?.value;
  const provider = request.cookies.get('meta_oauth_provider')?.value as MetaProvider | undefined;
  const code = request.nextUrl.searchParams.get('code');
  if (!state || !expectedState || state !== expectedState || !code || !provider) {
    return finish(NextResponse.redirect(integrationSettingsUrl({ error: 'oauth_state' })));
  }

  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID || '');
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET || '');
    tokenUrl.searchParams.set('redirect_uri', getMetaRedirectUri());
    tokenUrl.searchParams.set('code', code);
    const tokenResponse = await fetch(tokenUrl, { cache: 'no-store' });
    const token = (await tokenResponse.json()) as TokenResponse;
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error?.message || 'Token exchange failed');

    const pagesUrl = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}/me/accounts`);
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account');
    pagesUrl.searchParams.set('access_token', token.access_token);
    const pagesResponse = await fetch(pagesUrl, { cache: 'no-store' });
    const pagesPayload = (await pagesResponse.json()) as { data?: Page[]; error?: { message?: string } };
    if (!pagesResponse.ok) throw new Error(pagesPayload.error?.message || 'Could not load pages');

    const page = provider === 'INSTAGRAM'
      ? pagesPayload.data?.find((item) => item.instagram_business_account?.id)
      : pagesPayload.data?.[0];
    if (!page?.access_token) {
      return finish(NextResponse.redirect(integrationSettingsUrl({ error: provider === 'INSTAGRAM' ? 'instagram_not_eligible' : 'page_not_found' })));
    }

    const accountId = provider === 'INSTAGRAM' ? page.instagram_business_account!.id : page.id;
    const settingsJson = encryptIntegrationConfig({
      accessToken: page.access_token,
      pageId: page.id,
      pageName: page.name,
      accountId,
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      connectedVia: 'META_OAUTH',
    });
    const existing = await db.channel.findFirst({ where: { workspaceId, provider } });
    const channel = existing
      ? await db.channel.update({ where: { id: existing.id }, data: { name: page.name, settingsJson, isActive: true, healthStatus: 'CONNECTED' } })
      : await db.channel.create({ data: { workspaceId, provider, name: page.name, settingsJson, isActive: true, healthStatus: 'CONNECTED' } });
    await db.auditLog.create({
      data: { workspaceId, actorId: user.id, action: 'CHANNEL_CONNECTED_VIA_META_OAUTH', targetType: 'CHANNEL', targetId: channel.id, metadata: JSON.stringify({ provider, accountId }) },
    });
    return finish(NextResponse.redirect(integrationSettingsUrl({ connected: provider.toLowerCase() })));
  } catch (error) {
    console.error('Meta OAuth callback failed', error);
    return finish(NextResponse.redirect(integrationSettingsUrl({ error: 'oauth_failed' })));
  }
}
