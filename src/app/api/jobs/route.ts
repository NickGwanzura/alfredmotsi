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
    const { techIds, coTechIds, ...jobData } = body;

    const job = await prisma.job.create({
      data: {
        ...jobData,
        status: jobData.status || 'unallocated',
        technicians: techIds ? { connect: techIds.map((id: string) => ({ id })) } : undefined,
        coTechnicians: coTechIds ? { connect: coTechIds.map((id: string) => ({ id })) } : undefined,
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
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
