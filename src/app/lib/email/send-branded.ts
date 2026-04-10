/**
 * Branded Email Sending Functions
 * 
 * This module provides sending functions for the beautifully branded
 * email templates. All functions enforce email best practices.
 */

import { render } from '@react-email/components';
import {
  ClientPortalInviteEmail,
  ServiceConfirmationEmail,
  ServiceCompletionEmail,
  StatusUpdateEmail,
  TechnicianAssignmentEmail,
  ReminderEmail,
  FollowUpEmail,
  WelcomeEmail,
} from './templates-branded';
import { sendEmailWithBestPractices } from './send';

// ============================================
// CLIENT PORTAL EMAILS
// ============================================

interface SendPortalInviteParams {
  to: string;
  customerName: string;
  portalCode: string;
  email: string;
  loginUrl: string;
  companyName?: string;
}

export async function sendPortalInvite({
  to,
  customerName,
  portalCode,
  email,
  loginUrl,
  companyName,
}: SendPortalInviteParams) {
  const html = await render(
    ClientPortalInviteEmail({
      customerName,
      portalCode,
      email,
      loginUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `Your ${companyName || 'Client'} Portal Access is Ready`,
    html,
    category: 'portal-invite',
    isTransactional: true,
  });
}

// ============================================
// SERVICE EMAILS
// ============================================

interface SendServiceConfirmationParams {
  to: string;
  customerName: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  technicianName: string;
  technicianPhone?: string;
  address: string;
  referenceNumber: string;
  portalUrl?: string;
  companyName?: string;
}

export async function sendServiceConfirmation({
  to,
  customerName,
  serviceType,
  serviceDate,
  serviceTime,
  technicianName,
  technicianPhone,
  address,
  referenceNumber,
  portalUrl,
  companyName,
}: SendServiceConfirmationParams) {
  const html = await render(
    ServiceConfirmationEmail({
      customerName,
      serviceType,
      serviceDate,
      serviceTime,
      technicianName,
      technicianPhone,
      address,
      referenceNumber,
      portalUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `✓ Confirmed: ${serviceType} on ${serviceDate}`,
    html,
    category: 'service-confirmation',
    isTransactional: true,
  });
}

interface SendServiceCompletionParams {
  to: string;
  customerName: string;
  serviceType: string;
  completionDate: string;
  technicianName: string;
  workSummary: string;
  recommendations?: string;
  nextServiceDate?: string;
  reportUrl?: string;
  companyName?: string;
}

export async function sendServiceCompletion({
  to,
  customerName,
  serviceType,
  completionDate,
  technicianName,
  workSummary,
  recommendations,
  nextServiceDate,
  reportUrl,
  companyName,
}: SendServiceCompletionParams) {
  const html = await render(
    ServiceCompletionEmail({
      customerName,
      serviceType,
      completionDate,
      technicianName,
      workSummary,
      recommendations,
      nextServiceDate,
      reportUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `✓ Completed: Your ${serviceType}`,
    html,
    category: 'service-completion',
    isTransactional: true,
  });
}

// ============================================
// STATUS UPDATE EMAILS
// ============================================

interface SendStatusUpdateParams {
  to: string;
  customerName: string;
  serviceType: string;
  referenceNumber: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  updateTime: string;
  notes?: string;
  portalUrl?: string;
  companyName?: string;
}

export async function sendStatusUpdate({
  to,
  customerName,
  serviceType,
  referenceNumber,
  previousStatus,
  newStatus,
  updatedBy,
  updateTime,
  notes,
  portalUrl,
  companyName,
}: SendStatusUpdateParams) {
  const html = await render(
    StatusUpdateEmail({
      customerName,
      serviceType,
      referenceNumber,
      previousStatus,
      newStatus,
      updatedBy,
      updateTime,
      notes,
      portalUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `Status Update: ${serviceType} is now ${newStatus}`,
    html,
    category: 'status-update',
    isTransactional: true,
  });
}

// ============================================
// TECHNICIAN EMAILS
// ============================================

interface SendTechnicianAssignmentParams {
  to: string;
  technicianName: string;
  customerName: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  address: string;
  jobDescription: string;
  customerPhone?: string;
  referenceNumber: string;
  dashboardUrl?: string;
  companyName?: string;
}

export async function sendTechnicianAssignment({
  to,
  technicianName,
  customerName,
  serviceType,
  serviceDate,
  serviceTime,
  address,
  jobDescription,
  customerPhone,
  referenceNumber,
  dashboardUrl,
  companyName,
}: SendTechnicianAssignmentParams) {
  const html = await render(
    TechnicianAssignmentEmail({
      technicianName,
      customerName,
      serviceType,
      serviceDate,
      serviceTime,
      address,
      jobDescription,
      customerPhone,
      referenceNumber,
      dashboardUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `New Assignment: ${serviceType} - ${referenceNumber}`,
    html,
    category: 'technician-assignment',
    isTransactional: true,
  });
}

// ============================================
// REMINDER EMAILS
// ============================================

interface SendReminderParams {
  to: string;
  customerName: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  technicianName?: string;
  address: string;
  referenceNumber: string;
  portalUrl?: string;
  companyName?: string;
}

export async function sendReminder({
  to,
  customerName,
  serviceType,
  serviceDate,
  serviceTime,
  technicianName,
  address,
  referenceNumber,
  portalUrl,
  companyName,
}: SendReminderParams) {
  const html = await render(
    ReminderEmail({
      customerName,
      serviceType,
      serviceDate,
      serviceTime,
      technicianName,
      address,
      referenceNumber,
      portalUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `Reminder: Your ${serviceType} is tomorrow`,
    html,
    category: 'reminder',
    isTransactional: true,
  });
}

// ============================================
// FOLLOW-UP EMAILS
// ============================================

interface SendFollowUpParams {
  to: string;
  customerName: string;
  serviceType: string;
  completionDate: string;
  feedbackUrl?: string;
  reviewUrl?: string;
  companyName?: string;
}

export async function sendFollowUp({
  to,
  customerName,
  serviceType,
  completionDate,
  feedbackUrl,
  reviewUrl,
  companyName,
}: SendFollowUpParams) {
  const html = await render(
    FollowUpEmail({
      customerName,
      serviceType,
      completionDate,
      feedbackUrl,
      reviewUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `How was your ${serviceType} experience?`,
    html,
    category: 'follow-up',
    isTransactional: false, // Marketing-style
  });
}

// ============================================
// WELCOME EMAILS
// ============================================

interface SendWelcomeParams {
  to: string;
  customerName: string;
  portalUrl: string;
  companyName?: string;
}

export async function sendWelcome({
  to,
  customerName,
  portalUrl,
  companyName,
}: SendWelcomeParams) {
  const html = await render(
    WelcomeEmail({
      customerName,
      portalUrl,
      companyName,
    })
  );

  return sendEmailWithBestPractices({
    to,
    subject: `Welcome to ${companyName || 'Our Service'}!`,
    html,
    category: 'welcome',
    isTransactional: true,
  });
}

// ============================================
// BATCH SENDING HELPERS
// ============================================

/**
 * Send technician assignment to multiple technicians
 */
export async function sendTechnicianAssignments(
  assignments: SendTechnicianAssignmentParams[]
): Promise<{ success: number; failed: number; errors: unknown[] }> {
  const results = await Promise.allSettled(
    assignments.map(sendTechnicianAssignment)
  );

  return {
    success: results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length,
    failed: results.filter(r => r.status === 'rejected' || !(r.value as { success: boolean }).success).length,
    errors: results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason),
  };
}

/**
 * Send reminders to multiple customers
 */
export async function sendReminders(
  reminders: SendReminderParams[]
): Promise<{ success: number; failed: number; errors: unknown[] }> {
  const results = await Promise.allSettled(
    reminders.map(sendReminder)
  );

  return {
    success: results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length,
    failed: results.filter(r => r.status === 'rejected' || !(r.value as { success: boolean }).success).length,
    errors: results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason),
  };
}
