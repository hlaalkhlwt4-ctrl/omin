import { describe, expect, it } from 'vitest';
import {
  evolutionLidFromRawPayload,
  evolutionMessageIdempotencyKey,
  usableEvolutionJid,
} from './evolution-sync';

describe('Evolution LID handling', () => {
  const message = {
    key: {
      id: 'message-1',
      remoteJid: '174693600497708@lid',
      remoteJidAlt: '972567508786@s.whatsapp.net',
      fromMe: false,
    },
  };

  it('uses the phone JID for persistence while preserving the LID in raw payloads', () => {
    expect(usableEvolutionJid(message)).toBe('972567508786@s.whatsapp.net');
    expect(evolutionLidFromRawPayload(JSON.stringify(message))).toBe('174693600497708@lid');
  });

  it('uses one stable key for a LID message and its phone alias', () => {
    expect(evolutionMessageIdempotencyKey('channel-1', message))
      .toBe('evolution:channel-1:972567508786@s.whatsapp.net:in:message-1');
  });

  it('extracts LIDs from webhook envelopes', () => {
    expect(evolutionLidFromRawPayload(JSON.stringify({ event: 'messages.upsert', data: message })))
      .toBe('174693600497708@lid');
  });
});
