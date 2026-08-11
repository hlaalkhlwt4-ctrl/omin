import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import {
  getMetaGraphVersion,
  getMetaRedirectUri,
  getMetaScopes,
  integrationSettingsUrl,
  isMetaOAuthConfigured,
  type MetaProvider,
} from '@/lib/meta-integration';

export async function GET(request: NextRequest) {
  const { role } = await requireWritableWorkspaceContext();
  enforcePermission(role as WorkspaceRole, 'settings:manage');

  const rawProvider = request.nextUrl.searchParams.get('provider');
  if (rawProvider !== 'FACEBOOK' && rawProvider !== 'INSTAGRAM') {
    return NextResponse.redirect(integrationSettingsUrl({ error: 'invalid_provider' }));
  }
  if (!isMetaOAuthConfigured()) {
    return NextResponse.redirect(integrationSettingsUrl({ error: 'meta_not_configured' }));
  }

  const provider: MetaProvider = rawProvider;
  const state = randomBytes(32).toString('base64url');
  const authorizeUrl = new URL(`https://www.facebook.com/${getMetaGraphVersion()}/dialog/oauth`);
  authorizeUrl.searchParams.set('client_id', process.env.META_APP_ID!);
  authorizeUrl.searchParams.set('redirect_uri', getMetaRedirectUri());
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', getMetaScopes(provider).join(','));

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/integrations/meta/callback',
    maxAge: 10 * 60,
  });
  response.cookies.set('meta_oauth_provider', provider, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/integrations/meta/callback',
    maxAge: 10 * 60,
  });
  return response;
}
