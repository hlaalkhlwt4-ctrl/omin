import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { evolutionRecipientId, verifyMetaSignature } from './messaging';

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

describe('Evolution recipients', () => {
  it('keeps LID and group JIDs intact', () => {
    expect(evolutionRecipientId('174693600497708@lid')).toBe('174693600497708@lid');
    expect(evolutionRecipientId('120363389499655753@g.us')).toBe('120363389499655753@g.us');
  });

  it('normalizes phone JIDs and formatted phone numbers', () => {
    expect(evolutionRecipientId('972567508786@s.whatsapp.net')).toBe('972567508786');
    expect(evolutionRecipientId('+972 56-750-8786')).toBe('972567508786');
  });
});
