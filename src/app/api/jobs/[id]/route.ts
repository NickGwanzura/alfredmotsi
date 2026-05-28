import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth, authorizeRole, filterFinancialData } from '@/app/lib/auth/auth';
import { jobToClient, jobFromClient } from '@/app/lib/jobTransform';

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

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (userRole !== 'admin') {
      const isAssigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === userId);
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const clientJob = jobToClient({ ...job, customer: job.customer } as Record<string, unknown>);
    const filtered = filterFinancialData(session, clientJob);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { technicians: { select: { id: true } }, coTechnicians: { select: { id: true } } },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (userRole !== 'admin') {
      const assigned = [...existingJob.technicians, ...existingJob.coTechnicians].some(t => t.id === userId);
      if (!assigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

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

      if (diagnostics) {
        await tx.diagnostics.upsert({
          where: { jobId: id },
          update: diagnostics as any,
          create: { jobId: id, ...(diagnostics as any) },
        });
      }

      if (recurring) {
        await tx.recurringSchedule.upsert({
          where: { jobId: id },
          update: recurring as any,
          create: { jobId: id, ...(recurring as any) },
        });
      } else {
        await tx.recurringSchedule.deleteMany({ where: { jobId: id } });
      }

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
    if (error instanceof Error && error.message.includes('No records found')) {
      return NextResponse.json({ error: 'Job was modified by another user. Please refresh and retry.' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['admin']);
    if (forbidden) return forbidden;

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
