import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/auth';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { assertWorkspaceLimit } from '@/lib/plan-limits';
import { generateAiReplySuggestion, generateConversationSummary } from '@/lib/adapters/ai';
import { toErrorResponse } from '@/lib/errors';

const schema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(['SUGGEST', 'SUMMARY']).default('SUGGEST'),
});

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'inbox:manage_ai');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'المحادثة أو الإجراء غير صالح.' }, { status: 400 });

    const conversation = await db.conversation.findFirst({
      where: { id: parsed.data.conversationId, workspaceId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
    });
    if (!conversation) return NextResponse.json({ error: 'المحادثة غير موجودة.' }, { status: 404 });
    const estimatedInput = Math.ceil(conversation.messages.reduce((sum, message) => sum + message.body.length, 0) / 4);
    await assertWorkspaceLimit(workspaceId, 'aiTokensLimit', estimatedInput + 600);

    if (parsed.data.action === 'SUMMARY') {
      const summary = await generateConversationSummary(conversation.messages.map((message) => message.body));
      await db.aiUsageLog.create({
        data: { workspaceId, operation: 'CONVERSATION_SUMMARY', model: 'local-summary', inputTokens: 0, outputTokens: 0, isFallback: true },
      });
      return NextResponse.json({ result: summary, action: 'SUMMARY', isFallback: true });
    }

    const lastCustomerMessage = [...conversation.messages].reverse().find((message) => message.senderType === 'CONTACT');
    if (!lastCustomerMessage) return NextResponse.json({ error: 'لا توجد رسالة عميل لإنشاء اقتراح.' }, { status: 409 });
    const suggestion = await generateAiReplySuggestion({
      workspaceId,
      conversationId: conversation.id,
      lastCustomerMessage: lastCustomerMessage.body,
    });
    await db.aiUsageLog.create({
      data: {
        workspaceId,
        operation: 'REPLY_SUGGESTION',
        model: suggestion.model || 'unknown',
        inputTokens: suggestion.inputTokens || 0,
        outputTokens: suggestion.outputTokens || 0,
        isFallback: suggestion.isFallback,
      },
    });
    return NextResponse.json({ result: suggestion.suggestedReply, action: 'SUGGEST', ...suggestion });
  } catch (error) {
    return toErrorResponse(error, 'تعذر تشغيل مساعد الذكاء الاصطناعي.');
  }
}
