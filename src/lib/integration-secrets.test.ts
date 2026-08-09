import { afterEach, describe, expect, it } from 'vitest';
import { decryptIntegrationConfig, encryptIntegrationConfig, maskSecret } from './integration-secrets';

const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;
afterEach(() => { process.env.INTEGRATION_ENCRYPTION_KEY = originalKey; });

describe('integration secrets', () => {
  it('round-trips an authenticated encrypted configuration', () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const encrypted = encryptIntegrationConfig({ accessToken: 'very-secret-token', phoneId: '123' });
    expect(encrypted).not.toContain('very-secret-token');
    expect(decryptIntegrationConfig(encrypted)).toEqual({ accessToken: 'very-secret-token', phoneId: '123' });
  });

  it('masks all but the final four characters', () => {
    expect(maskSecret('abcdefgh')).toBe('••••efgh');
  });
});
