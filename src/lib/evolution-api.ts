export function isEvolutionConfigured() {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_WEBHOOK_SECRET);
}

export function evolutionInstanceName(workspaceId: string) {
  return `omniflow-${workspaceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase()}`;
}

export async function evolutionRequest(path: string, init: RequestInit = {}) {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Evolution API is not configured.');
  return fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'content-type': 'application/json', apikey: apiKey, ...init.headers },
  });
}

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
