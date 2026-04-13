import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendJobCompletedEmail } from '@/app/lib/email/send';

/**
 * POST /api/notifications/job-complete
 * Called when a technician marks a job as completed.
 * Sends a job-completion notification to all admin users.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

    // Fetch job with customer and lead tech
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        technicians: { select: { id: true, name: true } },
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Fetch all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, name: true },
    });

    if (admins.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const techName = job.technicians[0]?.name || 'Technician';
    const date = new Date(job.date + 'T12:00').toLocaleDateString('en-ZA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Send to each admin (fire all in parallel, swallow individual failures)
    const results = await Promise.allSettled(
      admins.map(admin =>
        sendJobCompletedEmail({
          to: admin.email,
          customerName: job.customer.name,
          jobTitle: job.title,
          jobDate: date,
          technicianName: techName,
          workDescription: job.description || 'Job completed on site.',
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log(`[job-complete notify] Job ${jobId} — sent ${sent}/${admins.length} admin emails`);

    return NextResponse.json({ ok: true, sent, total: admins.length });
  } catch (error) {
    console.error('[job-complete notify] Error:', error);
    // Never surface this to the user — notification failures are non-blocking
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
