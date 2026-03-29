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
  console.log('[API /email/tech-assignment] Received request');
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/tech-assignment] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      console.error('[API /email/tech-assignment] Forbidden - not admin:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: TechAssignmentRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API /email/tech-assignment] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('[API /email/tech-assignment] Request body:', body);

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

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!technicianName) missingFields.push('technicianName');
    if (!customerName) missingFields.push('customerName');
    if (!jobTitle) missingFields.push('jobTitle');
    if (!jobDate) missingFields.push('jobDate');
    if (!jobTime) missingFields.push('jobTime');
    if (!jobAddress) missingFields.push('jobAddress');
    if (!jobDescription) missingFields.push('jobDescription');
    if (!jobId) missingFields.push('jobId');

    if (missingFields.length > 0) {
      console.error('[API /email/tech-assignment] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    const payload = {
      to: to.trim(),
      technicianName: technicianName.trim(),
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobDate: jobDate.trim(),
      jobTime: jobTime.trim(),
      jobAddress: jobAddress.trim(),
      jobDescription: jobDescription.trim(),
      jobId: jobId.trim(),
      customerPhone: customerPhone?.trim(),
    };

    console.log('[API /email/tech-assignment] Calling sendTechAssignmentEmail with payload:', payload);

    const result = await sendTechAssignmentEmail(payload);

    if (!result.success) {
      console.error('[API /email/tech-assignment] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[API /email/tech-assignment] Email sent successfully');
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/tech-assignment] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
