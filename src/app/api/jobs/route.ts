import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth } from '@/app/lib/auth/auth';

// GET /api/jobs - List all jobs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const techId = searchParams.get('techId');
    const customerId = searchParams.get('customerId');

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (techId) {
      where.OR = [
        { technicians: { some: { id: techId } } },
        { coTechnicians: { some: { id: techId } } }
      ];
    }
    
    if (customerId) {
      where.customerId = customerId;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        customer: true,
        technicians: { select: { id: true, name: true, email: true } },
        coTechnicians: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create new job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['admin', 'tech'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Strip client-side-only / relation fields — only pass scalar Prisma fields
    const {
      techIds, coTechIds,
      // nested relations that must not be passed as scalars
      diagnostics, recurring, comments, history, gasUsageRecords, consumables, auditLogs,
      customer,
      // client-generated id (let DB generate its own)
      id,
      ...jobData
    } = body;

    console.log('[POST /api/jobs] jobData keys:', Object.keys(jobData));
    console.log('[POST /api/jobs] jobData:', JSON.stringify(jobData));

    const job = await prisma.job.create({
      data: {
        ...jobData,
        source: jobData.source || 'admin',
        status: jobData.status || 'unallocated',
        photos: jobData.photos || [],
        alerts: jobData.alerts || [],
        technicians: techIds?.length ? { connect: techIds.map((tid: string) => ({ id: tid })) } : undefined,
        coTechnicians: coTechIds?.length ? { connect: coTechIds.map((tid: string) => ({ id: tid })) } : undefined,
      },
      include: {
        customer: true,
        technicians: true,
        coTechnicians: true,
      }
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
