import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendJobScheduledEmail } from '@/app/lib/email/send';
import { isAdmin } from '@/app/lib/auth/auth';

interface JobScheduledRequest {
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API /email/job-scheduled] Received request');
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/job-scheduled] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      console.error('[API /email/job-scheduled] Forbidden - not admin:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: JobScheduledRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API /email/job-scheduled] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('[API /email/job-scheduled] Request body:', body);

    const {
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
    } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!customerName) missingFields.push('customerName');
    if (!jobTitle) missingFields.push('jobTitle');
    if (!jobDate) missingFields.push('jobDate');
    if (!jobTime) missingFields.push('jobTime');
    if (!jobType) missingFields.push('jobType');
    if (!jobAddress) missingFields.push('jobAddress');
    if (!jobId) missingFields.push('jobId');

    if (missingFields.length > 0) {
      console.error('[API /email/job-scheduled] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    console.log('[API /email/job-scheduled] Calling sendJobScheduledEmail');

    const result = await sendJobScheduledEmail({
      to: to.trim(),
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobDate: jobDate.trim(),
      jobTime: jobTime.trim(),
      jobType: jobType.trim(),
      jobAddress: jobAddress.trim(),
      technicianName: technicianName?.trim(),
      technicianPhone: technicianPhone?.trim(),
      jobId: jobId.trim(),
      portalUrl: portalUrl?.trim(),
    });

    if (!result.success) {
      console.error('[API /email/job-scheduled] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[API /email/job-scheduled] Email sent successfully');
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/job-scheduled] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
