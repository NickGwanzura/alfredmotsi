import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendJobCompletedEmail } from '@/app/lib/email/send';
import { generateJobCardPdf } from '@/app/lib/pdf/jobCardPdf';

/**
 * POST /api/notifications/job-complete
 * Called when a technician marks a job as completed.
 * Sends a job-completion notification with the Job Card PDF attached to:
 *  - All admin users
 *  - The customer on the job (if they have an email)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        technicians: { select: { id: true, name: true, phone: true } },
        coTechnicians: { select: { id: true, name: true } },
        diagnostics: true,
        gasUsageRecords: true,
        consumables: true,
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Generate the PDF once, reuse for all recipients
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateJobCardPdf(job);
    } catch (pdfErr) {
      console.error('[job-complete notify] PDF generation failed:', pdfErr);
      // Continue without attachment rather than failing the whole notification
    }

    const attachments = pdfBuffer
      ? [{
          filename: `JobCard-${job.jobCardRef}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
      : undefined;

    const techName = job.technicians[0]?.name || 'Technician';
    const date = new Date(job.date + 'T12:00').toLocaleDateString('en-ZA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, name: true },
    });

    // Build recipient list: admins + customer (if they have email)
    const recipients: { email: string; name: string; kind: 'admin' | 'customer' }[] = [
      ...admins.map(a => ({ email: a.email, name: a.name, kind: 'admin' as const })),
    ];
    if (job.customer.email) {
      recipients.push({ email: job.customer.email, name: job.customer.name, kind: 'customer' });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, total: 0 });
    }

    const results = await Promise.allSettled(
      recipients.map(r =>
        sendJobCompletedEmail({
          to: r.email,
          customerName: job.customer.name,
          jobTitle: job.title,
          jobDate: date,
          technicianName: techName,
          workDescription: job.description || 'Job completed on site.',
          attachments,
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const adminResults = results.slice(0, admins.length);
    const sentAdmins = adminResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const customerResult = job.customer.email ? results[admins.length] : undefined;
    const sentCustomer = !!(customerResult && customerResult.status === 'fulfilled' && (customerResult as PromiseFulfilledResult<{ success: boolean }>).value.success);

    console.log(
      `[job-complete notify] Job ${jobId} — sent ${sent}/${recipients.length} ` +
      `(admins: ${sentAdmins}/${admins.length}, customer: ${sentCustomer ? 'yes' : 'no'}, pdf: ${pdfBuffer ? 'attached' : 'missing'})`
    );

    return NextResponse.json({
      ok: true,
      sent,
      total: recipients.length,
      adminsSent: sentAdmins,
      customerSent: sentCustomer,
      pdfAttached: !!pdfBuffer,
    });
  } catch (error) {
    console.error('[job-complete notify] Error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
