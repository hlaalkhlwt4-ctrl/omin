import { describe, expect, it } from 'vitest';
import { choosePreferredAiModel } from './ai-provider-catalog';

describe('AI provider model selection', () => {
  it('prefers the configured catalog order', () => {
    expect(choosePreferredAiModel('OPENAI', ['gpt-4o-mini', 'gpt-5-mini']))
      .toBe('gpt-5-mini');
  });

  it('falls back to the first model returned by the provider', () => {
    expect(choosePreferredAiModel('GROQ', ['provider/new-model']))
      .toBe('provider/new-model');
  });

  it('rejects an empty provider model list', () => {
    expect(choosePreferredAiModel('DEEPSEEK', [])).toBeNull();
  });
});
