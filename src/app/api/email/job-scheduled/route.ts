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
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as JobScheduledRequest;
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

    if (!to || !customerName || !jobTitle || !jobDate || !jobTime || !jobType || !jobAddress || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sendJobScheduledEmail({
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
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('Error in job-scheduled email route:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
