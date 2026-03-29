import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendStatusUpdateEmail } from '@/app/lib/email/send';
import { isAdmin, isTech } from '@/app/lib/auth/auth';

interface StatusUpdateRequest {
  to: string;
  customerName: string;
  jobTitle: string;
  jobId: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API /email/status-update] Received request');
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/status-update] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role) && !isTech(session.user.role)) {
      console.error('[API /email/status-update] Forbidden - invalid role:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: StatusUpdateRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API /email/status-update] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('[API /email/status-update] Request body:', body);

    const {
      to,
      customerName,
      jobTitle,
      jobId,
      oldStatus,
      newStatus,
      notes,
    } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!customerName) missingFields.push('customerName');
    if (!jobTitle) missingFields.push('jobTitle');
    if (!jobId) missingFields.push('jobId');
    if (!oldStatus) missingFields.push('oldStatus');
    if (!newStatus) missingFields.push('newStatus');

    if (missingFields.length > 0) {
      console.error('[API /email/status-update] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    const updatedBy = session.user?.name ?? 'System';
    const updateTime = new Date().toLocaleString('en-ZA');

    console.log('[API /email/status-update] Calling sendStatusUpdateEmail with:', {
      to, customerName, jobTitle, jobId, oldStatus, newStatus, updatedBy, updateTime
    });

    const result = await sendStatusUpdateEmail({
      to: to.trim(),
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobId: jobId.trim(),
      oldStatus: oldStatus.trim(),
      newStatus: newStatus.trim(),
      updatedBy: updatedBy.trim(),
      updateTime,
      notes: notes?.trim(),
    });

    if (!result.success) {
      console.error('[API /email/status-update] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[API /email/status-update] Email sent successfully');
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/status-update] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
