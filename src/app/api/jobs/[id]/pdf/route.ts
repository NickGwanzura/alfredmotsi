import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { generateJobCardPdf } from '@/app/lib/pdf/jobCardPdf';

/**
 * GET /api/jobs/:id/pdf
 * Returns the Job Card as a PDF stream. Used for downloads from the UI
 * and can be linked from emails.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
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

  const pdf = await generateJobCardPdf(job);

  return new Response(pdf as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="JobCard-${job.jobCardRef}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
