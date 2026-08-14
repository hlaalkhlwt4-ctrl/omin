import { createHmac, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';
import { evolutionRequest } from '../evolution-api';

export type ChannelProviderType = 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'EMAIL' | 'DEV_MOCK';

export function verifyMetaSignature(headers: Record<string, string>, rawBody: string, secret?: string) {
  const appSecret = secret || process.env.META_APP_SECRET;
  const signature = headers['x-hub-signature-256'];
  if (!appSecret || !signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export interface OutboundMessagePayload {
  recipientId: string; // Phone or Handle or Email
  body: string;
  mediaUrl?: string;
  templateName?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerRawResponse?: any;
}

export interface MessagingAdapter {
  provider: ChannelProviderType;
  sendMessage(channelConfig: any, payload: OutboundMessagePayload): Promise<SendMessageResult>;
  verifyWebhook(headers: Record<string, string>, rawBody: string, verifyToken?: string): boolean;
  normalizeInboundPayload(rawPayload: any): Array<{
    senderHandle: string;
    senderName?: string;
    body: string;
    mediaUrl?: string;
    idempotencyKey: string;
  }>;
}

// -----------------------------------------------------------------------------
// Dev Mock Adapter (Local Testing)
// -----------------------------------------------------------------------------
export class DevMockMessagingAdapter implements MessagingAdapter {
  provider: ChannelProviderType = 'DEV_MOCK';

  async sendMessage(channelConfig: any, payload: OutboundMessagePayload): Promise<SendMessageResult> {
    if (process.env.NODE_ENV === 'development') {
      console.info('[DevMockAdapter] Simulated outbound message', { provider: this.provider });
    }
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      providerRawResponse: { status: 'DELIVERED', mock: true },
    };
  }

  verifyWebhook(): boolean {
    return true;
  }

  normalizeInboundPayload(rawPayload: any) {
    return [
      {
        senderHandle: rawPayload.sender || '+966500000001',
        senderName: rawPayload.senderName || 'عميل تجريبي',
        body: rawPayload.body || 'رسالة تجريبية من المزود المحاكي',
        idempotencyKey: `mock_evt_${Date.now()}`,
      },
    ];
  }
}

// -----------------------------------------------------------------------------
// Official WhatsApp Cloud API Adapter
// -----------------------------------------------------------------------------
export class WhatsAppCloudAdapter implements MessagingAdapter {
  provider: ChannelProviderType = 'WHATSAPP';

  async sendMessage(channelConfig: any, payload: OutboundMessagePayload): Promise<SendMessageResult> {
    if (channelConfig.connectedVia === 'EVOLUTION_API' && channelConfig.instanceName) {
      try {
        const response = await evolutionRequest(`/message/sendText/${encodeURIComponent(channelConfig.instanceName)}`, {
          method: 'POST',
          body: JSON.stringify({ number: payload.recipientId.replace(/@.*$/, '').replace(/\D/g, ''), text: payload.body, textMessage: { text: payload.body } }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return { success: false, error: data?.message || `Evolution API HTTP ${response.status}`, providerRawResponse: data };
        return { success: true, messageId: data?.key?.id, providerRawResponse: data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Evolution API network error' };
      }
    }
    const accessToken = channelConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = channelConfig.phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneId) {
      return {
        success: false,
        error: 'WhatsApp API Keys missing or unconfigured. Please connect official credentials in Settings.',
      };
    }

    try {
      const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
      const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.recipientId.replace(/\D/g, ''),
          type: 'text',
          text: { body: payload.body },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.error?.message || 'WhatsApp Cloud API request failed', providerRawResponse: data };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        providerRawResponse: data,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'WhatsApp network error' };
    }
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string, secret?: string): boolean {
    return verifyMetaSignature(headers, rawBody, secret);
  }

  normalizeInboundPayload(rawPayload: any) {
    const entries = rawPayload?.entry || [];
    const messages: any[] = [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        for (const msg of value.messages || []) {
          messages.push({
            senderHandle: msg.from,
            senderName: value.contacts?.[0]?.profile?.name || msg.from,
            body: msg.text?.body || '[وسائط/ملف]',
            mediaUrl: msg.image?.id || msg.document?.id,
            idempotencyKey: msg.id,
          });
        }
      }
    }
    return messages;
  }
}

// -----------------------------------------------------------------------------
// Meta Instagram DM & Facebook Messenger Adapter
// -----------------------------------------------------------------------------
export class MetaSocialAdapter implements MessagingAdapter {
  provider: ChannelProviderType;

  constructor(provider: 'INSTAGRAM' | 'FACEBOOK') {
    this.provider = provider;
  }

  async sendMessage(channelConfig: any, payload: OutboundMessagePayload): Promise<SendMessageResult> {
    const pageAccessToken = channelConfig.accessToken;

    if (!pageAccessToken) {
      return {
        success: false,
        error: `${this.provider} Page Access Token is missing. Please complete Meta OAuth in Settings.`,
      };
    }

    try {
      const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
      const response = await fetch(`https://graph.facebook.com/${version}/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: payload.recipientId },
          message: { text: payload.body },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.error?.message || 'Meta API error', providerRawResponse: data };
      }

      return { success: true, messageId: data.message_id, providerRawResponse: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string, secret?: string): boolean {
    return verifyMetaSignature(headers, rawBody, secret);
  }

  normalizeInboundPayload(rawPayload: any) {
    return [];
  }
}

export class EmailMessagingAdapter implements MessagingAdapter {
  provider: ChannelProviderType = 'EMAIL';

  async sendMessage(channelConfig: any, payload: OutboundMessagePayload): Promise<SendMessageResult> {
    const host = channelConfig.host || process.env.SMTP_HOST;
    const port = Number(channelConfig.port || process.env.SMTP_PORT || 587);
    const user = channelConfig.user || process.env.SMTP_USER;
    const pass = channelConfig.pass || process.env.SMTP_PASS;
    const from = channelConfig.from || process.env.SMTP_FROM;
    if (!host || !user || !pass || !from) {
      return { success: false, error: 'إعدادات SMTP غير مكتملة.' };
    }
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const info = await transporter.sendMail({
        from,
        to: payload.recipientId,
        subject: channelConfig.defaultSubject || 'رسالة من فريق الخدمة',
        text: payload.body,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Email send failed' };
    }
  }

  verifyWebhook(): boolean {
    return false;
  }

  normalizeInboundPayload() {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Adapter Factory
// -----------------------------------------------------------------------------
export function getMessagingAdapter(provider: ChannelProviderType): MessagingAdapter {
  switch (provider) {
    case 'WHATSAPP':
      return new WhatsAppCloudAdapter();
    case 'INSTAGRAM':
      return new MetaSocialAdapter('INSTAGRAM');
    case 'FACEBOOK':
      return new MetaSocialAdapter('FACEBOOK');
    case 'EMAIL':
      return new EmailMessagingAdapter();
    case 'DEV_MOCK':
    default:
      return new DevMockMessagingAdapter();
  }
}
