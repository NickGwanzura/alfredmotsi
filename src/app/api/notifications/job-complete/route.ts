import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendJobCompletedEmail } from '@/app/lib/email/send';
import { generateJobCardPdf } from '@/app/lib/pdf/jobCardPdf';
import { loadCompany } from '@/app/lib/pdf/company';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['admin', 'tech']);
    if (forbidden) return forbidden;

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

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    if (!isAdmin(userRole)) {
      const assigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === userId);
      if (!assigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateJobCardPdf(job, await loadCompany());
    } catch (pdfErr) {
      console.error('[job-complete notify] PDF generation failed:', pdfErr);
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

    const admins = await prisma.user.findMany({
      where: { role: { in: ['owner', 'admin'] } },
      select: { email: true, name: true },
    });

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

    return NextResponse.json({
      ok: true,
      sent,
      total: recipients.length,
      pdfAttached: !!pdfBuffer,
    });
  } catch (error) {
    console.error('[job-complete notify] Error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
