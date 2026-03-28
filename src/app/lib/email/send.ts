import { resend, FROM_EMAIL, isEmailEnabled } from './resend';
import { render } from '@react-email/components';
import {
  JobScheduledEmail,
  JobCompletedEmail,
  PortalInviteEmail,
  TechAssignmentEmail,
  UserInviteEmail,
  StatusUpdateEmail,
} from './templates-new';

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
  technicianName: string;
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
}: SendJobScheduledEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] Job scheduled email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      JobScheduledEmail({
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
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Service Appointment Confirmed - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('❌ Failed to send job scheduled email:', error);
      return { success: false, error };
    }

    console.log('✅ Job scheduled email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending job scheduled email:', error);
    return { success: false, error };
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
}: SendJobCompletedEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] Job completed email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      JobCompletedEmail({
        customerName,
        jobTitle,
        jobDate,
        technicianName,
        workDescription,
        recommendations,
        nextServiceDate,
        jobCardUrl,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Job Completed - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('❌ Failed to send job completed email:', error);
      return { success: false, error };
    }

    console.log('✅ Job completed email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending job completed email:', error);
    return { success: false, error };
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
}: SendStatusUpdateEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] Status update email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      StatusUpdateEmail({
        customerName,
        jobTitle,
        jobId,
        oldStatus,
        newStatus,
        updatedBy,
        updateTime,
        notes,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Job Status Update - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('❌ Failed to send status update email:', error);
      return { success: false, error };
    }

    console.log('✅ Status update email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending status update email:', error);
    return { success: false, error };
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
  loginUrl = 'https://splashair.co.za/login',
}: SendPortalInviteEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] Portal invite email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      PortalInviteEmail({
        customerName,
        portalCode,
        email: to,
        loginUrl,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your Splash Air Client Portal Access',
      html,
    });

    if (error) {
      console.error('❌ Failed to send portal invite email:', error);
      return { success: false, error };
    }

    console.log('✅ Portal invite email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending portal invite email:', error);
    return { success: false, error };
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
}: SendTechAssignmentEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] Tech assignment email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      TechAssignmentEmail({
        technicianName,
        customerName,
        jobTitle,
        jobDate,
        jobTime,
        jobAddress,
        jobDescription,
        customerPhone,
        jobId,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `New Job Assignment - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('❌ Failed to send tech assignment email:', error);
      return { success: false, error };
    }

    console.log('✅ Tech assignment email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending tech assignment email:', error);
    return { success: false, error };
  }
}

// ============================================
// USER INVITE EMAILS
// ============================================

interface SendUserInviteEmailParams {
  to: string;
  userName: string;
  tempPassword: string;
  role: string;
  loginUrl?: string;
}

export async function sendUserInviteEmail({
  to,
  userName,
  tempPassword,
  role,
  loginUrl = 'https://splashair.co.za/login',
}: SendUserInviteEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] User invite email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      UserInviteEmail({
        userName,
        userEmail: to,
        tempPassword,
        role,
        loginUrl,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Splash Air ${role.charAt(0).toUpperCase() + role.slice(1)} Account`,
      html,
    });

    if (error) {
      console.error('❌ Failed to send user invite email:', error);
      return { success: false, error };
    }

    console.log('✅ User invite email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending user invite email:', error);
    return { success: false, error };
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
}

export async function sendCustomEmail({
  to,
  subject,
  html,
  text,
}: SendCustomEmailParams) {
  if (!isEmailEnabled()) {
    console.log('📧 [Email Disabled] Custom email would be sent to:', to);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('❌ Failed to send custom email:', error);
      return { success: false, error };
    }

    console.log('✅ Custom email sent to:', to);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending custom email:', error);
    return { success: false, error };
  }
}
