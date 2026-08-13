import { getResend, FROM_EMAIL, isEmailEnabled } from './resend';
import { BRAND_ORIGIN } from '@/app/lib/brand';
import { render } from '@react-email/components';
import { prisma } from '@/app/lib/db';
import {
  JobScheduledEmail,
  JobCompletedEmail,
  PortalInviteEmail,
  TechAssignmentEmail,
  StatusUpdateEmail,
  PasswordResetEmail,
} from './templates-new';
import {
  validateEmailContent,
  htmlToText,
  generateEmailHeaders,
  generateListUnsubscribeHeader,
  checkRateLimit,
  EMAIL_CONFIG,
} from './standards';

// ============================================
// EMAIL SEND WRAPPER (ENFORCES BEST PRACTICES)
// ============================================

interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  category?: string;
  isTransactional?: boolean;
  campaignId?: string;
  attachments?: EmailAttachment[];
}

type EmailDeliveryStatus = 'sent' | 'failed' | 'skipped';

function getResendMessageId(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'id' in data) {
    const id = (data as { id?: unknown }).id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

function safeJsonValue(value: unknown): unknown {
  if (value == null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { message: String(value) };
  }
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : String(message);
  }
  return String(error);
}

async function recordEmailDeliveryLog({
  recipients,
  subject,
  category,
  status,
  resendData,
  resendError,
  errorMessage,
}: {
  recipients: string[];
  subject: string;
  category?: string;
  status: EmailDeliveryStatus;
  resendData?: unknown;
  resendError?: unknown;
  errorMessage?: string;
}): Promise<void> {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        recipient: recipients[0] || '',
        recipients,
        subject,
        category: category || null,
        status,
        resendMessageId: getResendMessageId(resendData) || null,
        resendData: safeJsonValue(resendData) as any,
        resendError: safeJsonValue(resendError) as any,
        errorMessage: errorMessage || getErrorMessage(resendError) || null,
      },
    });
  } catch (logError) {
    console.error('[email-log] Failed to record delivery log:', getErrorMessage(logError));
  }
}

/**
 * Core email send function with best practices enforcement
 * - Validates content before sending
 * - Generates plain text version
 * - Adds deliverability headers
 * - Implements rate limiting
 */
export async function sendEmailWithBestPractices({
  to,
  subject,
  html,
  text,
  category,
  isTransactional = true,
  campaignId,
  attachments,
}: SendEmailOptions): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  const recipients = Array.isArray(to) ? to : [to];
  const primaryRecipient = recipients[0];
  
  if (!isEmailEnabled()) {
    await recordEmailDeliveryLog({
      recipients,
      subject,
      category,
      status: 'skipped',
      errorMessage: 'Email not configured',
    });
    return { success: false, error: 'Email not configured' };
  }

  // Validate recipient email format
  const validation = validateEmailContent({ to: primaryRecipient, subject, html });
  if (!validation.valid) {
    console.error('[sendEmailWithBestPractices] Validation failed:', validation.errors);
    await recordEmailDeliveryLog({
      recipients,
      subject,
      category,
      status: 'failed',
      errorMessage: `Validation failed: ${validation.errors.join(', ')}`,
    });
    return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(primaryRecipient);
  if (!rateLimit.allowed) {
    console.error('[sendEmailWithBestPractices] Rate limit exceeded for:', primaryRecipient);
    await recordEmailDeliveryLog({
      recipients,
      subject,
      category,
      status: 'failed',
      errorMessage: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} minutes.`,
    });
    return { 
      success: false, 
      error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} minutes.` 
    };
  }

  try {
    // Generate plain text version if not provided
    const plainText = text || htmlToText(html);
    
    // Generate deliverability headers
    const headers = generateEmailHeaders({ category, isTransactional, campaignId });
    
    // Add List-Unsubscribe for non-transactional emails
    if (!isTransactional) {
      const listUnsubscribe = generateListUnsubscribeHeader(primaryRecipient);
      if (listUnsubscribe) {
        headers['List-Unsubscribe'] = listUnsubscribe;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }
    }

    const resendClient = getResend();
    if (!resendClient) {
      await recordEmailDeliveryLog({
        recipients,
        subject,
        category,
        status: 'failed',
        errorMessage: 'Email client not available',
      });
      return { success: false, error: 'Email client not available' };
    }

    const resendAttachments = attachments?.map(a => ({
      filename: a.filename,
      content: typeof a.content === 'string' ? a.content : a.content,
      contentType: a.contentType,
    }));

    const { data, error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: recipients,
      subject,
      html,
      text: plainText,
      replyTo: EMAIL_CONFIG.replyTo,
      headers,
      ...(resendAttachments && resendAttachments.length > 0 && { attachments: resendAttachments }),
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      await recordEmailDeliveryLog({
        recipients,
        subject,
        category,
        status: 'failed',
        resendError: error,
        errorMessage: getErrorMessage(error),
      });
      return { success: false, error };
    }

    await recordEmailDeliveryLog({
      recipients,
      subject,
      category,
      status: 'sent',
      resendData: data,
    });
    return { success: true, data };
  } catch (error: unknown) {
    console.error('❌ Error sending email:', error);
    await recordEmailDeliveryLog({
      recipients,
      subject,
      category,
      status: 'failed',
      resendError: error,
      errorMessage: getErrorMessage(error),
    });
    return { success: false, error: String(error) };
  }
}

// ============================================
// JOB EMAILS
// ============================================

interface SendJobScheduledEmailParams {
  to: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobType: string;
  jobAddress: string;
  technicianName?: string;
  technicianPhone?: string;
  jobId: string;
  portalUrl?: string;
}

export async function sendJobScheduledEmail({
  to,
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobType,
  jobAddress,
  technicianName,
  technicianPhone,
  jobId,
  portalUrl,
}: SendJobScheduledEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  
  // Validate required fields
  if (!to || !customerName || !jobTitle || !jobDate || !jobTime || !jobType || !jobAddress || !jobId) {
    console.error('[sendJobScheduledEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const safeTechnicianName = technicianName?.trim() || 'Technician';
    const safeTechnicianPhone = technicianPhone?.trim() || 'Not provided';
    const safePortalUrl = portalUrl?.trim() || '';

    const emailProps = {
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobDate: jobDate.trim(),
      jobTime: jobTime.trim(),
      jobType: jobType.trim(),
      jobAddress: jobAddress.trim(),
      technicianName: safeTechnicianName,
      technicianPhone: safeTechnicianPhone,
      jobId: jobId.trim(),
      portalUrl: safePortalUrl,
    };


    const html = await render(JobScheduledEmail(emailProps));

    return await sendEmailWithBestPractices({
      to,
      subject: `Service Appointment Confirmed - ${jobTitle}`,
      html,
      category: 'job-scheduled',
      isTransactional: true,
    });
  } catch (error: unknown) {
    console.error('❌ Error sending job scheduled email:', error);
    return { success: false, error: String(error) };
  }
}

interface SendJobCompletedEmailParams {
  to: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  technicianName: string;
  workDescription: string;
  recommendations?: string;
  nextServiceDate?: string;
  jobCardUrl?: string;
  attachments?: EmailAttachment[];
}

export async function sendJobCompletedEmail({
  to,
  customerName,
  jobTitle,
  jobDate,
  technicianName,
  workDescription,
  recommendations,
  nextServiceDate,
  jobCardUrl,
  attachments,
}: SendJobCompletedEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  
  // Validate required fields
  if (!to || !customerName || !jobTitle || !jobDate || !technicianName || !workDescription) {
    console.error('[sendJobCompletedEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const emailProps = {
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobDate: jobDate.trim(),
      technicianName: technicianName.trim(),
      workDescription: workDescription.trim(),
      recommendations: recommendations?.trim() || undefined,
      nextServiceDate: nextServiceDate?.trim() || undefined,
      jobCardUrl: jobCardUrl?.trim() || undefined,
    };


    const html = await render(JobCompletedEmail(emailProps));

    return await sendEmailWithBestPractices({
      to,
      subject: `Job Completed - ${jobTitle}`,
      html,
      category: 'job-completed',
      isTransactional: true,
      attachments,
    });
  } catch (error: unknown) {
    console.error('❌ Error sending job completed email:', error);
    return { success: false, error: String(error) };
  }
}

interface SendStatusUpdateEmailParams {
  to: string;
  customerName: string;
  jobTitle: string;
  jobId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  updateTime: string;
  notes?: string;
}

export async function sendStatusUpdateEmail({
  to,
  customerName,
  jobTitle,
  jobId,
  oldStatus,
  newStatus,
  updatedBy,
  updateTime,
  notes,
}: SendStatusUpdateEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  
  // Validate required fields
  if (!to || !customerName || !jobTitle || !jobId || !oldStatus || !newStatus || !updatedBy || !updateTime) {
    console.error('[sendStatusUpdateEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const emailProps = {
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobId: jobId.trim(),
      oldStatus: oldStatus.trim(),
      newStatus: newStatus.trim(),
      updatedBy: updatedBy.trim(),
      updateTime: updateTime.trim(),
      notes: notes?.trim() || undefined,
    };


    const html = await render(StatusUpdateEmail(emailProps));

    return await sendEmailWithBestPractices({
      to,
      subject: `Job Status Update - ${jobTitle}`,
      html,
      category: 'status-update',
      isTransactional: true,
    });
  } catch (error: unknown) {
    console.error('❌ Error sending status update email:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// PORTAL EMAILS
// ============================================

interface SendPortalInviteEmailParams {
  to: string;
  customerName: string;
  portalCode: string;
  loginUrl?: string;
}

export async function sendPortalInviteEmail({
  to,
  customerName,
  portalCode,
  loginUrl = `${BRAND_ORIGIN}/login`,
}: SendPortalInviteEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  
  // Validate required fields
  if (!to || !customerName || !portalCode) {
    console.error('[sendPortalInviteEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const emailProps = {
      customerName: customerName.trim(),
      portalCode: portalCode.trim(),
      email: to.trim(),
      loginUrl: loginUrl.trim(),
    };


    const html = await render(PortalInviteEmail(emailProps));

    return await sendEmailWithBestPractices({
      to,
      subject: 'Your Splash Air Client Portal Access',
      html,
      category: 'portal-invite',
      isTransactional: true,
    });
  } catch (error: unknown) {
    console.error('❌ Error sending portal invite email:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// TECHNICIAN EMAILS
// ============================================

interface SendTechAssignmentEmailParams {
  to: string;
  technicianName: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobAddress: string;
  jobDescription: string;
  customerPhone?: string;
  jobId: string;
}

export async function sendTechAssignmentEmail({
  to,
  technicianName,
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobAddress,
  jobDescription,
  customerPhone,
  jobId,
}: SendTechAssignmentEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  
  // Validate required fields
  if (!to || !technicianName || !customerName || !jobTitle || !jobDate || !jobTime || !jobAddress || !jobDescription || !jobId) {
    console.error('[sendTechAssignmentEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const emailProps = {
      technicianName: technicianName.trim(),
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobDate: jobDate.trim(),
      jobTime: jobTime.trim(),
      jobAddress: jobAddress.trim(),
      jobDescription: jobDescription.trim(),
      customerPhone: customerPhone?.trim() || 'Not provided',
      jobId: jobId.trim(),
    };


    const html = await render(TechAssignmentEmail(emailProps));

    return await sendEmailWithBestPractices({
      to,
      subject: `New Job Assignment - ${jobTitle}`,
      html,
      category: 'tech-assignment',
      isTransactional: true,
    });
  } catch (error: unknown) {
    console.error('❌ Error sending tech assignment email:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// USER INVITE EMAILS
// ============================================

interface SendUserInviteEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
}

export async function sendUserInviteEmail({
  to,
  userName,
  resetUrl,
}: SendUserInviteEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  if (!to || !userName || !resetUrl) {
    console.error('[sendUserInviteEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  return sendPasswordResetEmail({ to, userName, resetUrl });
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  if (!to || !userName || !resetUrl) {
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const html = await render(PasswordResetEmail({ userName, resetUrl }));
    return await sendEmailWithBestPractices({
      to,
      subject: 'Reset your Splash Air password',
      html,
      category: 'password-reset',
      isTransactional: true,
    });
  } catch (error: unknown) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// GENERIC EMAIL
// ============================================

interface SendCustomEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  category?: string;
  isTransactional?: boolean;
}

export async function sendCustomEmail({
  to,
  subject,
  html,
  text,
  category = 'custom',
  isTransactional = true,
}: SendCustomEmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  // Validate required fields
  if (!to || !subject || !html) {
    console.error('[sendCustomEmail] Missing required fields');
    return { success: false, error: 'Missing required fields' };
  }

  return await sendEmailWithBestPractices({
    to,
    subject,
    html,
    text,
    category,
    isTransactional,
  });
}

// ============================================
// EXPORTS
// ============================================

export { generatePreviewText, htmlToText, validateEmailContent } from './standards';
