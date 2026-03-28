import { resend, FROM_EMAIL, isEmailEnabled } from './resend';
import { render } from '@react-email/components';
import {
  JobScheduledEmail,
  JobCompletionEmail,
  PortalInviteEmail,
  TechAssignmentEmail,
} from './templates';

interface SendJobScheduledEmailParams {
  to: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobType: string;
  technicianName?: string;
  jobId: string;
}

export async function sendJobScheduledEmail({
  to,
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobType,
  technicianName,
  jobId,
}: SendJobScheduledEmailParams) {
  if (!isEmailEnabled()) {
    console.log('Email disabled - Job scheduled email not sent');
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
        technicianName,
        jobId,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Job Scheduled - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('Failed to send job scheduled email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending job scheduled email:', error);
    return { success: false, error };
  }
}

interface SendJobCompletionEmailParams {
  to: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  technicianName: string;
  workDescription: string;
  nextServiceDate?: string;
}

export async function sendJobCompletionEmail({
  to,
  customerName,
  jobTitle,
  jobDate,
  technicianName,
  workDescription,
  nextServiceDate,
}: SendJobCompletionEmailParams) {
  if (!isEmailEnabled()) {
    console.log('Email disabled - Job completion email not sent');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      JobCompletionEmail({
        customerName,
        jobTitle,
        jobDate,
        technicianName,
        workDescription,
        nextServiceDate,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Job Completed - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('Failed to send job completion email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending job completion email:', error);
    return { success: false, error };
  }
}

interface SendPortalInviteEmailParams {
  to: string;
  customerName: string;
  portalCode: string;
}

export async function sendPortalInviteEmail({
  to,
  customerName,
  portalCode,
}: SendPortalInviteEmailParams) {
  if (!isEmailEnabled()) {
    console.log('Email disabled - Portal invite email not sent');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const html = await render(
      PortalInviteEmail({
        customerName,
        portalCode,
        email: to,
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your Splash Air Client Portal Access',
      html,
    });

    if (error) {
      console.error('Failed to send portal invite email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending portal invite email:', error);
    return { success: false, error };
  }
}

interface SendTechAssignmentEmailParams {
  to: string;
  technicianName: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobAddress: string;
  jobDescription: string;
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
}: SendTechAssignmentEmailParams) {
  if (!isEmailEnabled()) {
    console.log('Email disabled - Tech assignment email not sent');
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
      })
    );

    const { data, error } = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `New Job Assignment - ${jobTitle}`,
      html,
    });

    if (error) {
      console.error('Failed to send tech assignment email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending tech assignment email:', error);
    return { success: false, error };
  }
}

// Generic email sender for custom emails
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
    console.log('Email disabled - Custom email not sent');
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
      console.error('Failed to send custom email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending custom email:', error);
    return { success: false, error };
  }
}
