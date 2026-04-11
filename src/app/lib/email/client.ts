// Client-side email service for triggering emails from components

interface EmailResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

// Job Scheduled Email
export async function sendJobScheduledEmail(payload: {
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
}): Promise<EmailResult> {
  try {
    const response = await fetch('/api/email/job-scheduled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send email' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending job scheduled email:', error);
    return { success: false, error: 'Network error' };
  }
}

// Job Completed Email
export async function sendJobCompletedEmail(payload: {
  to: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  technicianName: string;
  workDescription: string;
  recommendations?: string;
  nextServiceDate?: string;
  jobCardUrl?: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch('/api/email/job-completed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send email' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending job completed email:', error);
    return { success: false, error: 'Network error' };
  }
}

// Status Update Email
export async function sendStatusUpdateEmail(payload: {
  to: string;
  customerName: string;
  jobTitle: string;
  jobId: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch('/api/email/status-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send email' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending status update email:', error);
    return { success: false, error: 'Network error' };
  }
}

// Portal Invite Email
export async function sendPortalInviteEmail(payload: {
  to: string;
  customerName: string;
  portalCode: string;
  loginUrl?: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch('/api/email/portal-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Surface the actual Resend/server error detail when available
      const detail = data.details || data.message || data.error || 'Failed to send email';
      return { success: false, error: detail };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending portal invite email:', error);
    return { success: false, error: 'Network error — check your connection.' };
  }
}

// Tech Assignment Email
export async function sendTechAssignmentEmail(payload: {
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
}): Promise<EmailResult> {
  try {
    const response = await fetch('/api/email/tech-assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send email' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending tech assignment email:', error);
    return { success: false, error: 'Network error' };
  }
}

// User Invite Email (for new technicians/staff)
export async function sendUserInviteEmail(payload: {
  to: string;
  userName: string;
  tempPassword: string;
  role: string;
  loginUrl?: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch('/api/email/user-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send email' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending user invite email:', error);
    return { success: false, error: 'Network error' };
  }
}

// Helper to format date for emails
export function formatEmailDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to format time for emails
export function formatEmailTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Helper to get customer address
export function getCustomerAddress(customer: { address: string; siteAddress?: string }): string {
  return customer.siteAddress || customer.address;
}
