import { db } from '../db';
import { getDefaultAiModelSettings } from '../platform-providers';

export interface AiSuggestionRequest {
  workspaceId: string;
  conversationId: string;
  lastCustomerMessage: string;
}

export interface AiSuggestionResponse {
  suggestedReply: string;
  confidence: number;
  sourcesUsed: string[];
  isFallback: boolean;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export async function generateAiReplySuggestion(
  req: AiSuggestionRequest
): Promise<AiSuggestionResponse> {
  // 1. Fetch AI Agent Settings & Knowledge Chunks
  const agent = await db.aiAgent.findUnique({
    where: { workspaceId: req.workspaceId },
    include: { chunks: true },
  });

  if (!agent || !agent.isEnabled || agent.mode === 'OFF') {
    return {
      suggestedReply: 'المساعد الذكي غير مفعّل حالياً لهذا النشاط.',
      confidence: 0,
      sourcesUsed: [],
      isFallback: true,
    };
  }

  // 2. Fetch Relevant Knowledge Chunks
  const matchingChunks = agent.chunks.filter((c) =>
    req.lastCustomerMessage.toLowerCase().includes(c.title.toLowerCase()) ||
    c.content.toLowerCase().includes(req.lastCustomerMessage.toLowerCase())
  );

  const contextText = matchingChunks.length > 0
    ? matchingChunks.map((c) => `[${c.title}]: ${c.content}`).join('\n')
    : agent.chunks.map((c) => `[${c.title}]: ${c.content}`).join('\n');

  // 3. Fallback response formatting when external LLM API key is mock or absent
  const modelSettings = await getDefaultAiModelSettings();
  const apiKey = modelSettings?.apiKey;

  if (!apiKey || apiKey === 'mock_openai_api_key') {
    // Grounded rule-based response generator using internal context
    let reply = `أهلاً بك! بناءً على معلومات ${agent.name}:\n`;
    if (matchingChunks.length > 0) {
      reply += matchingChunks[0].content;
    } else if (agent.businessInfo) {
      reply += `${agent.businessInfo} - نسعد بخدمتك وإجابة كافة استفساراتك!`;
    } else {
      reply += `شكراً لتواصلك معنا! سيقوم أحد ممثلي فريق الخدمة بالرد عليك في أقرب وقت.`;
    }

    return {
      suggestedReply: reply,
      confidence: matchingChunks.length > 0 ? 0.85 : 0.65,
      sourcesUsed: matchingChunks.map((c) => c.title),
      isFallback: true,
      model: 'local-knowledge',
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  // Real OpenAI call if valid key is set
  try {
    const prompt = `أنت ${agent.name}، ودورك: ${agent.role}.\nالنبرة: ${agent.tone}.\nسياق النشاط والمعرفة:\n${contextText}\n\nسؤال العميل: "${req.lastCustomerMessage}"\nصغ رداً عربياً دقيقاً ومهنياً:`;
    
    const response = await fetch(`${modelSettings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelSettings.modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'AI provider request failed');
    const suggestedReply = data.choices?.[0]?.message?.content || 'نعتذر، لم نتمكن من توليد الرد حالياً.';

    return {
      suggestedReply,
      confidence: 0.9,
      sourcesUsed: matchingChunks.map((c) => c.title),
      isFallback: false,
      model: modelSettings.modelId,
      inputTokens: Number(data.usage?.prompt_tokens || 0),
      outputTokens: Number(data.usage?.completion_tokens || 0),
    };
  } catch (err) {
    return {
      suggestedReply: `شكراً لتواصلك! سيتابع معك موظف الخدمة فوراً.`,
      confidence: 0.5,
      sourcesUsed: [],
      isFallback: true,
      model: modelSettings?.modelId || 'unavailable',
    };
  }
}

export async function generateConversationSummary(messages: string[]): Promise<string> {
  if (messages.length === 0) return 'لا توجد رسائل سابقة في هذه المحادثة.';
  return `الملخص: تضمنت المحادثة ${messages.length} رسالة تدور حول الاستفسار عن تفاصيل الطلب والمنتجات والأسعار والتأكيد.`;
}
