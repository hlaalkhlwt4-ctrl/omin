export type MetaProvider = 'FACEBOOK' | 'INSTAGRAM';

export function getMetaGraphVersion() {
  return process.env.META_GRAPH_API_VERSION || 'v23.0';
}

export function getMetaAppUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function getMetaRedirectUri() {
  return process.env.META_OAUTH_REDIRECT_URI || `${getMetaAppUrl()}/api/integrations/meta/callback`;
}

export function isMetaOAuthConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function getMetaScopes(provider: MetaProvider) {
  const shared = ['pages_show_list', 'pages_manage_metadata'];
  return provider === 'INSTAGRAM'
    ? [...shared, 'instagram_basic', 'instagram_manage_messages']
    : [...shared, 'pages_messaging'];
}

export function integrationSettingsUrl(params: Record<string, string>) {
  const url = new URL('/settings/integrations', getMetaAppUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}
