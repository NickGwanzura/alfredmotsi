import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendJobScheduledEmail } from '@/app/lib/email/send';
import { isAdmin } from '@/app/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      to,
      customerName,
      jobTitle,
      jobDate,
      jobTime,
      jobType,
      technicianName,
      jobId,
    } = body;

    if (!to || !customerName || !jobTitle || !jobDate || !jobTime || !jobType || !jobId) {
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
      technicianName,
      jobId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in job-scheduled email route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
