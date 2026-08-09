import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyMetaSignature } from './messaging';

describe('Meta webhook signatures', () => {
  it('accepts a matching sha256 signature and rejects tampering', () => {
    const secret = 'test-secret-with-enough-entropy';
    const body = JSON.stringify({ entry: [{ id: '1' }] });
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyMetaSignature({ 'x-hub-signature-256': signature }, body, secret)).toBe(true);
    expect(verifyMetaSignature({ 'x-hub-signature-256': signature }, `${body} `, secret)).toBe(false);
  });

  it('rejects missing signatures', () => expect(verifyMetaSignature({}, '{}', 'secret')).toBe(false));
});
