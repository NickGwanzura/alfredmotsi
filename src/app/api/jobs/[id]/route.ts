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

// PUT /api/jobs/[id] - Update job (including diagnostics, comments, history)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const {
      techIds, coTechIds,
      diagnostics, recurring, comments, history, gasUsageRecords, consumables, auditLogs,
      customer, id: _id, technicians: _t, coTechnicians: _ct,
      createdAt, updatedAt, version: _version,
      ...rawUpdate
    } = body;

    const updateData = jobFromClient(rawUpdate as Record<string, unknown>);

    const result = await prisma.$transaction(async (tx) => {
      // Update job core fields with optimistic locking
      const whereClause: any = { id };
      if (_version !== undefined) whereClause.version = _version;

      const job = await tx.job.update({
        where: whereClause,
        data: {
          ...updateData,
          version: { increment: 1 },
          ...(techIds && { technicians: { set: techIds.map((tid: string) => ({ id: tid })) } }),
          ...(coTechIds && { coTechnicians: { set: coTechIds.map((tid: string) => ({ id: tid })) } }),
        },
        include: {
          customer: true, technicians: true, coTechnicians: true, diagnostics: true,
          comments: true, history: true,
        },
      });

      // Upsert diagnostics
      if (diagnostics) {
        await tx.diagnostics.upsert({
          where: { jobId: id },
          update: diagnostics as any,
          create: { jobId: id, ...(diagnostics as any) },
        });
      }

      // Handle recurring schedule (upsert)
      if (recurring) {
        await tx.recurringSchedule.upsert({
          where: { jobId: id },
          update: recurring as any,
          create: { jobId: id, ...(recurring as any) },
        });
      } else {
        // If explicitly sent as null/undefined, delete any existing
        await tx.recurringSchedule.deleteMany({ where: { jobId: id } });
      }

      // Replace comments if array provided
      if (Array.isArray(comments)) {
        await tx.comment.deleteMany({ where: { jobId: id } });
        for (const c of comments) {
          await tx.comment.create({
            data: {
              jobId: id,
              author: c.author || 'Unknown',
              text: c.text,
              time: c.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            },
          });
        }
      }

      // Replace history if array provided
      if (Array.isArray(history)) {
        await tx.historyEntry.deleteMany({ where: { jobId: id } });
        for (const h of history) {
          await tx.historyEntry.create({
            data: {
              jobId: id,
              date: h.date || new Date().toISOString().split('T')[0],
              note: h.note,
            },
          });
        }
      }

      // Fetch final job with all needed relations
      return await tx.job.findUnique({
        where: { id },
        include: {
          customer: true, technicians: true, coTechnicians: true, diagnostics: true,
          comments: true, history: true, recurring: true,
        },
      });
    });

    return NextResponse.json(jobToClient(result as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating job:', error);
    // Optimistic lock failure: version mismatch (no rows updated)
    if (error instanceof Error && error.message.includes('No records found')) {
      return NextResponse.json({ error: 'Job was modified by another user. Please refresh and retry.' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Delete job (admin only, requires reason)
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

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { error: 'A reason is required to delete a job.' },
        { status: 400 }
      );
    }

    const existing = await prisma.job.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const user = session.user as { id: string; name?: string | null };
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Record audit entry and delete job atomically
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name || 'Unknown',
          action: 'delete_job',
          jobId: id,
          reason,
          ipAddress,
          userAgent,
        },
      }),
      prisma.job.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
