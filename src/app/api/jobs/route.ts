import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth, filterFinancialArray, authorizeRole } from '@/app/lib/auth/auth';
import { jobToClient, jobFromClient } from '@/app/lib/jobTransform';
import { sendPushToUsers } from '@/app/lib/push/server';
import { auditServiceAction } from '@/app/lib/serviceAuth';
import { emitServiceNotification } from '@/app/lib/notifications/provider';

function minutes(value: string): number {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const techId = searchParams.get('techId');
    const customerId = searchParams.get('customerId');

    const where: any = {};

    if (!['owner', 'admin', 'dispatcher', 'accounts', 'sales'].includes(userRole)) {
      where.OR = [
        { technicians: { some: { id: userId } } },
        { coTechnicians: { some: { id: userId } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (techId) {
      // Only admins can filter by another tech's ID
      if (['owner', 'admin', 'dispatcher'].includes(userRole)) {
        where.OR = [
          { technicians: { some: { id: techId } } },
          { coTechnicians: { some: { id: techId } } },
        ];
      }
      // For non-admins, keep their own scope filter (OR already set above)
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
        diagnostics: true,
      },
      orderBy: { date: 'asc' }
    });

    const clientJobs = jobs.map(j => jobToClient(j as Record<string, unknown>));
    const filtered = filterFinancialArray(session, clientJobs);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const {
      techIds, coTechIds,
      diagnostics, recurring, comments, history, gasUsageRecords, consumables, auditLogs,
      customer,
      id,
      ...jobData
    } = body;

    const prismaData = jobFromClient({
      ...jobData,
      source: (jobData.source as string) || 'admin',
      status: (jobData.status as string) || 'unallocated',
      photos: (jobData.photos as string[]) || [],
      alerts: (jobData.alerts as string[]) || [],
    });

    if (techIds?.length && prismaData.date && prismaData.time) {
      const start = minutes(prismaData.time as string);
      const end = start + Math.max(30, Number(prismaData.durationMinutes || 120));
      const sameDay = await prisma.job.findMany({
        where: {
          date: prismaData.date as string,
          status: { notIn: ['cancelled', 'completed'] },
          OR: [{ technicians: { some: { id: { in: techIds } } } }, { coTechnicians: { some: { id: { in: techIds } } } }],
        },
        select: { id: true, jobCardRef: true, time: true, durationMinutes: true },
      });
      const conflict = sameDay.find((job) => {
        const otherStart = minutes(job.time);
        return start < otherStart + job.durationMinutes && end > otherStart;
      });
      if (conflict) return NextResponse.json({ error: `Technician is already booked during this time (${conflict.jobCardRef})`, conflict }, { status: 409 });
    }

    const job = await prisma.job.create({
      data: {
        ...(prismaData as any),
        technicians: techIds?.length ? { connect: techIds.map((tid: string) => ({ id: tid })) } : undefined,
        coTechnicians: coTechIds?.length ? { connect: coTechIds.map((tid: string) => ({ id: tid })) } : undefined,
      },
      include: {
        customer: true,
        technicians: true,
        coTechnicians: true,
      }
    });

    // Push notification to assigned technicians
    if (techIds?.length) {
      sendPushToUsers(techIds, {
        title: 'New Job Assigned',
        body: `${job.title} — ${job.customer?.name || ''}`,
        url: '/',
      });
      emitServiceNotification({ event: 'job.technician_assigned', channel: 'email', jobId: job.id, customerId: job.customerId, payload: { jobRef: job.jobCardRef, techIds } }).catch(() => undefined);
    }

    await auditServiceAction(session, 'create_job', `Created job ${job.jobCardRef}`, job.id);

    return NextResponse.json(jobToClient(job as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
