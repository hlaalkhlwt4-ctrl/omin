import nodemailer from 'nodemailer';
import { structuredLog } from './observability';
import { getPlatformSmtpSettings, type PlatformSmtpSettings } from './platform-providers';

export async function isEmailConfigured() {
  return Boolean(await getPlatformSmtpSettings());
}

export function createSmtpTransport(config: PlatformSmtpSettings) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character);
}

async function safelySend(message: Parameters<ReturnType<typeof createSmtpTransport>['sendMail']>[0]) {
  const config = await getPlatformSmtpSettings();
  if (!config) return false;
  try {
    await createSmtpTransport(config).sendMail({
      ...message,
      from: message.from || `"${config.fromName.replace(/[\r\n"]/g, '')}" <${config.fromEmail}>`,
    });
    return true;
  } catch (error) {
    structuredLog('error', 'transactional_email_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  return safelySend({
    to: email,
    subject: 'إعادة تعيين كلمة المرور',
    text: `استخدم الرابط التالي خلال 30 دقيقة لإعادة تعيين كلمة المرور: ${resetUrl}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>إعادة تعيين كلمة المرور</h2><p>اضغط الرابط التالي خلال 30 دقيقة:</p><p><a href="${resetUrl}">تعيين كلمة مرور جديدة</a></p><p>إذا لم تطلب ذلك فتجاهل الرسالة.</p></div>`,
  });
}

export async function sendEmailVerificationEmail(email: string, verificationUrl: string) {
  return safelySend({
    to: email,
    subject: 'تأكيد البريد الإلكتروني في OmniFlow',
    text: `أكد بريدك الإلكتروني خلال 24 ساعة باستخدام الرابط التالي: ${verificationUrl}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>تأكيد البريد الإلكتروني</h2><p>اضغط الرابط التالي خلال 24 ساعة لإكمال إنشاء حسابك:</p><p><a href="${verificationUrl}">تأكيد البريد والبدء</a></p><p>إذا لم تنشئ هذا الحساب فتجاهل الرسالة.</p></div>`,
  });
}

export async function sendWorkspaceInvitationEmail(email: string, invitationUrl: string, workspaceName: string) {
  const safeWorkspaceName = escapeHtml(workspaceName);
  return safelySend({
    to: email,
    subject: `دعوة للانضمام إلى ${workspaceName}`,
    text: `تمت دعوتك للانضمام إلى ${workspaceName}. استخدم الرابط خلال 7 أيام: ${invitationUrl}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>دعوة فريق</h2><p>تمت دعوتك للانضمام إلى <strong>${safeWorkspaceName}</strong>.</p><p><a href="${invitationUrl}">قبول الدعوة</a></p><p>تنتهي صلاحية الرابط خلال 7 أيام.</p></div>`,
  });
}
