import { db } from './db';
import { assertWorkspaceLimit } from './plan-limits';
import { getMessagingAdapter, type ChannelProviderType } from './adapters/messaging';
import { enqueueJob } from './jobs';
import { Prisma } from '@prisma/client';
import { generateAiReplySuggestion } from './adapters/ai';
import { decryptIntegrationConfig } from './integration-secrets';

type CampaignPayload = { campaignId: string };

async function processMetaWebhook(workspaceId: string, payload: { webhookEventId: string }) {
  const webhookEvent = await db.webhookEvent.findFirst({
    where: { id: payload.webhookEventId, workspaceId },
  });
  if (!webhookEvent || webhookEvent.status === 'PROCESSED') return;
  const channel = await db.channel.findFirst({ where: { id: webhookEvent.channelId, workspaceId } });
  if (!channel) throw new Error('Webhook channel not found.');
  await db.webhookEvent.update({ where: { id: webhookEvent.id }, data: { status: 'PROCESSING' } });

  try {
    const adapter = getMessagingAdapter(channel.provider as ChannelProviderType);
    const events = adapter.normalizeInboundPayload(JSON.parse(webhookEvent.payload));
    for (const event of events.slice(0, 100)) {
      if (await db.message.findUnique({ where: { idempotencyKey: event.idempotencyKey } })) continue;
      let contactChannel = await db.contactChannel.findFirst({
        where: { provider: channel.provider, handleId: event.senderHandle, contact: { workspaceId } },
        include: { contact: true },
      });
      if (!contactChannel) {
        const contact = await db.contact.create({
          data: {
            workspaceId,
            fullName: event.senderName || event.senderHandle,
            phone: channel.provider === 'WHATSAPP' ? event.senderHandle : null,
            source: channel.provider,
            channels: { create: { provider: channel.provider, handleId: event.senderHandle, optInStatus: true } },
          },
          include: { channels: true },
        });
        contactChannel = { ...contact.channels[0], contact };
      }
      let conversation = await db.conversation.findFirst({
        where: { workspaceId, channelId: channel.id, contactId: contactChannel.contactId, status: { not: 'CLOSED' } },
        orderBy: { lastMessageAt: 'desc' },
      });
      conversation ||= await db.conversation.create({ data: { workspaceId, channelId: channel.id, contactId: contactChannel.contactId } });
      try {
        await db.$transaction([
          db.message.create({ data: { conversationId: conversation.id, senderType: 'CONTACT', channel: channel.provider, body: event.body, mediaUrl: event.mediaUrl, rawPayload: webhookEvent.payload, idempotencyKey: event.idempotencyKey } }),
          db.conversation.update({ where: { id: conversation.id }, data: { unreadCount: { increment: 1 }, lastMessageAt: new Date() } }),
        ]);
        await enqueueJob({
          workspaceId,
          type: 'AUTOMATION_TRIGGER',
          payload: { triggerEvent: 'NEW_MESSAGE', conversationId: conversation.id, contactId: contactChannel.contactId, messageIdempotencyKey: event.idempotencyKey },
          idempotencyKey: `automation:new-message:${event.idempotencyKey}`,
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      }
    }
    await db.$transaction([
      db.webhookEvent.update({ where: { id: webhookEvent.id }, data: { status: 'PROCESSED', processedAt: new Date(), lastError: null } }),
      db.channel.update({ where: { id: channel.id }, data: { healthStatus: 'CONNECTED' } }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    await db.webhookEvent.update({ where: { id: webhookEvent.id }, data: { status: 'FAILED', lastError: message } });
    throw error;
  }
}

async function processCampaign(workspaceId: string, payload: CampaignPayload) {
  const campaign = await db.campaign.findFirst({ where: { id: payload.campaignId, workspaceId } });
  if (!campaign) throw new Error('Campaign not found in workspace.');
  if (!['SCHEDULED', 'RUNNING'].includes(campaign.status)) return;

  const provider = campaign.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
  const channel = await db.channel.findFirst({
    where: { workspaceId, provider, isActive: true, healthStatus: 'CONNECTED' },
  });
  if (!channel) throw new Error(`No connected ${provider} channel.`);

  const recipients = await db.contactChannel.findMany({
    where: { provider, optInStatus: true, contact: { workspaceId } },
    include: { contact: true },
    take: 1000,
  });
  const suppressed = await db.suppressionEntry.findMany({ where: { workspaceId, channel: provider } });
  const blocked = new Set(suppressed.map((entry) => entry.address.toLowerCase()));
  const eligible = recipients.filter((recipient) => !blocked.has(recipient.handleId.toLowerCase()));
  await assertWorkspaceLimit(workspaceId, 'maxMessages', eligible.length);
  await db.campaign.update({ where: { id: campaign.id }, data: { status: 'RUNNING' } });

  const adapter = getMessagingAdapter(provider as ChannelProviderType);
  const config = decryptIntegrationConfig(channel.settingsJson);
  let sent = 0;
  let failed = 0;
  for (const recipient of eligible) {
    const idempotencyKey = `campaign:${campaign.id}:${recipient.id}`;
    if (await db.message.findUnique({ where: { idempotencyKey } })) continue;
    const result = await adapter.sendMessage(config, { recipientId: recipient.handleId, body: campaign.templateContent });
    if (!result.success) {
      failed += 1;
      continue;
    }
    let conversation = await db.conversation.findFirst({
      where: { workspaceId, contactId: recipient.contactId, channelId: channel.id, status: { not: 'CLOSED' } },
      orderBy: { lastMessageAt: 'desc' },
    });
    if (!conversation) {
      conversation = await db.conversation.create({ data: { workspaceId, contactId: recipient.contactId, channelId: channel.id } });
    }
    await db.message.create({
      data: { conversationId: conversation.id, senderType: 'AUTOMATION', channel: provider, body: campaign.templateContent, idempotencyKey },
    });
    sent += 1;
  }

  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      status: failed > 0 && sent === 0 ? 'FAILED' : 'COMPLETED',
      sentCount: { increment: sent },
      deliveredCount: { increment: sent },
      failedCount: { increment: failed },
    },
  });
}

async function processAutomationTrigger(workspaceId: string, payload: Record<string, unknown>) {
  const triggerEvent = String(payload.triggerEvent || '');
  const automations = await db.automation.findMany({
    where: { workspaceId, triggerEvent, isActive: true },
    include: { steps: { orderBy: { sortingOrder: 'asc' } } },
  });
  for (const automation of automations) {
    const run = await db.automationRun.create({
      data: { workspaceId, automationId: automation.id, triggerEvent, triggerData: JSON.stringify(payload) },
    });
    try {
      for (const step of automation.steps) {
        const config = JSON.parse(step.stepConfig || '{}') as Record<string, unknown>;
        if (step.stepType === 'ADD_TAG') {
          const contactId = String(payload.contactId || '');
          const tagName = String(config.tagName || 'متابعة آلية');
          const contact = await db.contact.findFirst({ where: { id: contactId, workspaceId }, select: { id: true } });
          if (!contact) throw new Error('Automation contact not found.');
          let tag = await db.tag.findFirst({ where: { workspaceId, name: tagName } });
          tag ||= await db.tag.create({ data: { workspaceId, name: tagName } });
          await db.contactTag.upsert({ where: { contactId_tagId: { contactId, tagId: tag.id } }, update: {}, create: { contactId, tagId: tag.id } });
        } else if (step.stepType === 'ASSIGN_USER') {
          const userId = String(config.userId || '');
          const member = await db.workspaceMember.findFirst({ where: { workspaceId, userId, status: 'ACTIVE' } });
          if (!member) throw new Error('Automation assignee is not an active member.');
          if (payload.conversationId) await db.conversation.updateMany({ where: { id: String(payload.conversationId), workspaceId }, data: { assignedUserId: userId } });
          if (payload.contactId) await db.contact.updateMany({ where: { id: String(payload.contactId), workspaceId }, data: { assignedUserId: userId } });
        } else if (['SEND_MESSAGE', 'SEND_EMAIL', 'AI_REPLY'].includes(step.stepType)) {
          const contactId = String(payload.contactId || '');
          const conversationId = String(payload.conversationId || '');
          const conversation = conversationId ? await db.conversation.findFirst({ where: { id: conversationId, workspaceId }, include: { channel: true } }) : null;
          const requestedProvider = step.stepType === 'SEND_EMAIL' ? 'EMAIL' : String(config.provider || conversation?.channel.provider || 'DEV_MOCK');
          const channel = conversation?.channel.provider === requestedProvider
            ? conversation.channel
            : await db.channel.findFirst({ where: { workspaceId, provider: requestedProvider, isActive: true, healthStatus: 'CONNECTED' } });
          if (!channel) throw new Error(`Automation channel ${requestedProvider} is not connected.`);
          const destination = await db.contactChannel.findFirst({ where: { contactId, provider: requestedProvider, optInStatus: true, contact: { workspaceId } } });
          if (!destination) throw new Error(`Contact has no opted-in ${requestedProvider} address.`);
          const suppressed = await db.suppressionEntry.findUnique({ where: { workspaceId_channel_address: { workspaceId, channel: requestedProvider, address: destination.handleId } } });
          if (suppressed) throw new Error('Automation recipient is suppressed.');
          let body = String(config.body || config.message || '').trim();
          if (step.stepType === 'AI_REPLY') {
            if (!conversation) throw new Error('AI reply requires a conversation.');
            const lastInbound = await db.message.findFirst({ where: { conversationId: conversation.id, senderType: 'CONTACT' }, orderBy: { createdAt: 'desc' } });
            if (!lastInbound) throw new Error('AI reply requires a customer message.');
            const suggestion = await generateAiReplySuggestion({ workspaceId, conversationId: conversation.id, lastCustomerMessage: lastInbound.body });
            body = suggestion.suggestedReply;
            const agent = await db.aiAgent.findUnique({ where: { workspaceId } });
            await db.aiUsageLog.create({ data: { workspaceId, agentId: agent?.id, operation: 'AUTOMATION_REPLY', model: suggestion.model || 'unknown', inputTokens: suggestion.inputTokens || 0, outputTokens: suggestion.outputTokens || 0, isFallback: suggestion.isFallback } });
            if (agent && suggestion.confidence < agent.confidenceThreshold) throw new Error('AI confidence is below the configured auto-reply threshold.');
          }
          if (!body) throw new Error('Automation message body is empty.');
          await assertWorkspaceLimit(workspaceId, 'maxMessages', 1);
          const adapter = getMessagingAdapter(requestedProvider as ChannelProviderType);
          const result = await adapter.sendMessage(decryptIntegrationConfig(channel.settingsJson), { recipientId: destination.handleId, body });
          if (!result.success) throw new Error(result.error || 'Automation send failed.');
          let targetConversation = conversation;
          if (!targetConversation) targetConversation = await db.conversation.findFirst({ where: { workspaceId, contactId, channelId: channel.id, status: { not: 'CLOSED' } }, include: { channel: true } });
          if (!targetConversation) targetConversation = await db.conversation.create({ data: { workspaceId, contactId, channelId: channel.id }, include: { channel: true } });
          await db.message.create({ data: { conversationId: targetConversation.id, senderType: step.stepType === 'AI_REPLY' ? 'AI' : 'AUTOMATION', channel: requestedProvider, body, idempotencyKey: `automation:${run.id}:${step.id}` } });
          await db.conversation.update({ where: { id: targetConversation.id }, data: { lastMessageAt: new Date() } });
        } else {
          throw new Error(`Automation step ${step.stepType} requires additional reviewed configuration.`);
        }
        await db.automationRunEvent.create({ data: { runId: run.id, stepId: step.id, status: 'COMPLETED', message: step.stepType } });
      }
      await db.automationRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automation failed';
      await db.automationRun.update({ where: { id: run.id }, data: { status: 'FAILED', completedAt: new Date(), lastError: message } });
    }
  }
}

export async function handleBackgroundJob(job: { type: string; workspaceId: string | null; payload: unknown }) {
  if (!job.workspaceId) throw new Error('Workspace-scoped job is missing workspaceId.');
  if (job.type === 'WEBHOOK_META') return processMetaWebhook(job.workspaceId, job.payload as { webhookEventId: string });
  if (job.type === 'CAMPAIGN_SEND') return processCampaign(job.workspaceId, job.payload as CampaignPayload);
  if (job.type === 'AUTOMATION_TRIGGER') return processAutomationTrigger(job.workspaceId, job.payload as Record<string, unknown>);
  throw new Error(`Unsupported job type: ${job.type}`);
}
