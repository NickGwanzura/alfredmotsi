import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendJobCompletedEmail } from '@/app/lib/email/send';
import { isAdmin, isTech } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { consumeOutboundEmail } from '@/app/lib/email/outbound-rate-limit';

interface JobCompletedRequest {
  to: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  technicianName: string;
  workDescription: string;
  jobId: string;
  recommendations?: string;
  nextServiceDate?: string;
  jobCardUrl?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/job-completed] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role) && !isTech(session.user.role)) {
      console.error('[API /email/job-completed] Forbidden - invalid role:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!consumeOutboundEmail(session.user.id!)) return NextResponse.json({ error: 'Outbound email limit reached. Try again later.' }, { status: 429 });

    let body: JobCompletedRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API /email/job-completed] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }


    const {
      to,
      customerName,
      jobTitle,
      jobDate,
      technicianName,
      workDescription,
      jobId,
      recommendations,
      nextServiceDate,
      jobCardUrl,
    } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!customerName) missingFields.push('customerName');
    if (!jobTitle) missingFields.push('jobTitle');
    if (!jobDate) missingFields.push('jobDate');
    if (!technicianName) missingFields.push('technicianName');
    if (!workDescription) missingFields.push('workDescription');
    if (!jobId) missingFields.push('jobId');

    if (missingFields.length > 0) {
      console.error('[API /email/job-completed] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({ where: { id: jobId.trim() }, include: { customer: { select: { email: true } }, technicians: { select: { id: true } }, coTechnicians: { select: { id: true } } } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const isAssigned = [...job.technicians, ...job.coTechnicians].some((tech) => tech.id === session.user.id);
    if (!isAdmin(session.user.role) && !isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (job.customer.email.toLowerCase() !== to.trim().toLowerCase()) return NextResponse.json({ error: 'Recipient must match the job customer' }, { status: 400 });


    const result = await sendJobCompletedEmail({
      to: to.trim(),
      customerName: customerName.trim(),
      jobTitle: jobTitle.trim(),
      jobDate: jobDate.trim(),
      technicianName: technicianName.trim(),
      workDescription: workDescription.trim(),
      recommendations: recommendations?.trim(),
      nextServiceDate: nextServiceDate?.trim(),
      jobCardUrl: jobCardUrl?.trim(),
    });

    if (!result.success) {
      console.error('[API /email/job-completed] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/job-completed] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
