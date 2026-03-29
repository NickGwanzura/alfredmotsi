import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendTechAssignmentEmail } from '@/app/lib/email/send';
import { isAdmin } from '@/app/lib/auth/auth';

interface TechAssignmentRequest {
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as TechAssignmentRequest;
    const {
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
    } = body;

    if (!to || !technicianName || !customerName || !jobTitle || !jobDate || !jobTime || !jobAddress || !jobDescription || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const payload = {
      to,
      technicianName,
      customerName,
      jobTitle,
      jobDate,
      jobTime,
      jobAddress,
      jobDescription,
      jobId,
      customerPhone,
    };

    console.log('[Tech Assignment Email] Sending payload:', payload);

    const result = await sendTechAssignmentEmail(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('Error in tech-assignment email route:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
