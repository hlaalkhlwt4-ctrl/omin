export const AI_PROVIDERS = {
  OPENAI: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini'],
  },
  OPENROUTER: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-5-mini', 'openai/gpt-4.1-mini', 'anthropic/claude-sonnet-4.5', 'google/gemini-2.5-flash', 'deepseek/deepseek-chat-v3.1'],
  },
  GROQ: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'groq/compound-mini'],
  },
  GEMINI: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-3.6-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  },
  DEEPSEEK: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  CUSTOM: {
    label: 'مزود مخصص متوافق مع OpenAI',
    baseUrl: '',
    models: [],
  },
} as const;

export type AiProviderId = keyof typeof AI_PROVIDERS;

export const ADDABLE_AI_PROVIDER_IDS = ['OPENAI', 'OPENROUTER', 'GROQ', 'GEMINI', 'DEEPSEEK'] as const;

export type AddableAiProviderId = typeof ADDABLE_AI_PROVIDER_IDS[number];

export function choosePreferredAiModel(provider: AddableAiProviderId, availableModels: string[]) {
  const available = new Set(availableModels);
  return AI_PROVIDERS[provider].models.find((modelId) => available.has(modelId)) || availableModels[0] || null;
}

export const AI_KEY_TYPES = [
  { id: 'STANDARD', label: 'مفتاح API عادي' },
  { id: 'PROJECT', label: 'مفتاح مشروع' },
  { id: 'MANAGEMENT', label: 'مفتاح إدارة/رصيد' },
] as const;

export function isAiProviderId(value: string): value is AiProviderId {
  return value in AI_PROVIDERS;
}
