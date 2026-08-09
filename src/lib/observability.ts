export type LogLevel = 'info' | 'warn' | 'error';

function sanitize(metadata: Record<string, unknown>) {
  const blocked = /password|token|secret|authorization|cookie|api[-_]?key/i;
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, blocked.test(key) ? '[REDACTED]' : value]));
}

export function structuredLog(level: LogLevel, event: string, metadata: Record<string, unknown> = {}) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...sanitize(metadata) });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}
