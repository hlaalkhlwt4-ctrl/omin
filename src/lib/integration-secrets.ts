import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

type EncryptedEnvelope = { v: 1; alg: 'aes-256-gcm'; iv: string; tag: string; data: string };

export function isIntegrationEncryptionConfigured() {
  if (process.env.INTEGRATION_ENCRYPTION_KEY) {
    try { return Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY, 'base64').length === 32; } catch { return false; }
  }
  return process.env.NODE_ENV !== 'production' && Boolean(process.env.JWT_SECRET);
}

function encryptionKey() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (value) {
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) throw new Error('INTEGRATION_ENCRYPTION_KEY must be a base64 encoded 32-byte key.');
    return key;
  }
  if (process.env.NODE_ENV !== 'production' && process.env.JWT_SECRET) {
    return createHash('sha256').update(`omniflow:integration:${process.env.JWT_SECRET}`).digest();
  }
  throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured.');
}

export function encryptIntegrationConfig(config: Record<string, unknown>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
  const envelope: EncryptedEnvelope = { v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
  return JSON.stringify(envelope);
}

export function decryptIntegrationConfig(value?: string | null): Record<string, unknown> {
  if (!value) return {};
  const parsed = JSON.parse(value) as Partial<EncryptedEnvelope> & Record<string, unknown>;
  if (parsed.v !== 1 || parsed.alg !== 'aes-256-gcm' || !parsed.iv || !parsed.tag || !parsed.data) return parsed;
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8'));
}

export function maskSecret(value?: string) {
  if (!value) return 'غير مضبوط';
  return value.length <= 4 ? '••••' : `••••${value.slice(-4)}`;
}
