import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { generateJobCardPdf } from '@/app/lib/pdf/jobCardPdf';
import { loadCompany } from '@/app/lib/pdf/company';

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

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  if (!isAdmin(userRole)) {
    const assigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === userId);
    if (!assigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const company = await loadCompany();
  const pdf = await generateJobCardPdf(job, company);

  return new Response(pdf as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="JobCard-${job.jobCardRef}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
