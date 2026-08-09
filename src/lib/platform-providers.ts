import { db } from './db';
import { decryptIntegrationConfig } from './integration-secrets';

export type PlatformSmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

export type PlatformAiModelSettings = {
  id?: string;
  displayName: string;
  provider: string;
  baseUrl: string;
  modelId: string;
  apiKey: string;
};

export async function getPlatformSmtpSettings(options: { allowUntested?: boolean } = {}): Promise<PlatformSmtpSettings | null> {
  const saved = await db.platformEmailConfig.findUnique({ where: { id: 'default' } });
  if (saved) {
    if (!options.allowUntested && saved.status !== 'CONNECTED') return null;
    const config = decryptIntegrationConfig(saved.encryptedConfig);
    return {
      host: String(config.host || ''),
      port: Number(config.port || 587),
      secure: Boolean(config.secure),
      user: String(config.user || ''),
      pass: String(config.pass || ''),
      fromEmail: String(config.fromEmail || ''),
      fromName: String(config.fromName || 'OmniFlow'),
    };
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) return null;
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.SMTP_FROM,
    fromName: 'OmniFlow',
  };
}

export async function getDefaultAiModelSettings(): Promise<PlatformAiModelSettings | null> {
  const saved = await db.platformAiModel.findFirst({
    where: { isActive: true, isDefault: true, status: 'CONNECTED' },
    orderBy: { updatedAt: 'desc' },
  });
  if (saved) {
    const config = decryptIntegrationConfig(saved.encryptedConfig);
    return {
      id: saved.id,
      displayName: saved.displayName,
      provider: saved.provider,
      baseUrl: saved.baseUrl.replace(/\/$/, ''),
      modelId: saved.modelId,
      apiKey: String(config.apiKey || ''),
    };
  }
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('mock_')) return null;
  return {
    displayName: 'OpenAI (Environment)',
    provider: 'OPENAI_COMPATIBLE',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    modelId: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
  };
}
