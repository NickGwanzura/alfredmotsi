import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth } from '@/app/lib/auth/auth';
import { jobToClient, jobFromClient } from '@/app/lib/jobTransform';

// GET /api/jobs/[id] - Get single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        technicians: true,
        coTechnicians: true,
        diagnostics: true,
        comments: true,
        history: true,
        recurring: true,
        gasUsageRecords: true,
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(jobToClient(job as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/[id] - Update job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Strip all relation/non-scalar fields, keep only scalar updates
    const {
      techIds, coTechIds,
      diagnostics, recurring, comments, history, gasUsageRecords, consumables, auditLogs,
      customer, id: _id, technicians: _t, coTechnicians: _ct,
      createdAt, updatedAt,
      ...rawUpdate
    } = body;

    // Map display enum values → Prisma enum keys
    const updateData = jobFromClient(rawUpdate as Record<string, unknown>);

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...updateData,
        ...(techIds && {
          technicians: { set: techIds.map((tid: string) => ({ id: tid })) }
        }),
        ...(coTechIds && {
          coTechnicians: { set: coTechIds.map((tid: string) => ({ id: tid })) }
        }),
      },
      include: {
        customer: true,
        technicians: true,
        coTechnicians: true,
        diagnostics: true,
      }
    });

    return NextResponse.json(jobToClient(job as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Delete job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.job.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
