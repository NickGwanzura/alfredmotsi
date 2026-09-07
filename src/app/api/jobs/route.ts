import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth, filterFinancialArray, authorizeRole } from '@/app/lib/auth/auth';
import { jobToClient, jobFromClient } from '@/app/lib/jobTransform';
import { sendPushToUsers } from '@/app/lib/push/server';
import { sendTechAssignmentEmail } from '@/app/lib/email/send';
import { auditServiceAction, cleanText } from '@/app/lib/serviceAuth';
import { emitServiceNotification } from '@/app/lib/notifications/provider';
import { JobStatus, Prisma } from '@prisma/client';
import crypto from 'node:crypto';

function minutes(value: string): number {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

class SchedulingConflictError extends Error {
  constructor(public readonly conflict: { id: string; jobCardRef: string; time: string; durationMinutes: number }) {
    super(`Technician is already booked during this time (${conflict.jobCardRef})`);
    this.name = 'SchedulingConflictError';
  }
}

const safeUserSelect = { id: true, name: true, email: true, role: true, phone: true, specialty: true, status: true, image: true } as const;
const safeCustomerSelect = { id: true, name: true, address: true, siteAddress: true, phone: true, whatsapp: true, email: true, portalEnabled: true } as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const techId = searchParams.get('techId');
    const customerId = searchParams.get('customerId');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 250, 1), 500);
    const cursor = cleanText(searchParams.get('cursor'), 100);

    const where: Prisma.JobWhereInput = {};

    if (!['owner', 'admin', 'dispatcher', 'accounts', 'sales'].includes(userRole)) {
      where.OR = [
        { technicians: { some: { id: userId } } },
        { coTechnicians: { some: { id: userId } } },
      ];
    }

    if (status) {
      if (!Object.values(JobStatus).includes(status as JobStatus)) {
        return NextResponse.json({ error: 'Invalid job status filter' }, { status: 400 });
      }
      where.status = status as JobStatus;
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
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = jobs.length > limit;
    const page = hasMore ? jobs.slice(0, limit) : jobs;
    const clientJobs = page.map(j => jobToClient(j as Record<string, unknown>));
    const filtered = filterFinancialArray(session, clientJobs);

    const response = NextResponse.json(filtered);
    if (hasMore) response.headers.set('X-Next-Cursor', page.at(-1)!.id);
    return response;
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

    // Technicians may update assigned jobs, but may not create or assign jobs.
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'sales']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const {
      techIds, coTechIds,
      diagnostics, recurring, comments, history, gasUsageRecords, consumables, auditLogs,
      customer: _customer,
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

    const validSources = new Set(['admin', 'portal', 'phone', 'whatsapp', 'website', 'referral', 'facebook', 'google', 'walk_in', 'repeat']);
    const validTypes = new Set(['installation', 'maintenance', 'repair', 'sales', 'inspection', 'callout']);
    const validUnits = new Set(['Split_System', 'Ducted', 'Package_Unit', 'Multi_Head', 'Cassette', 'VRV_VRF', 'Refrigeration_System', 'Chiller', 'Heat_Pump', 'Precision_Cooling']);
    const validIssues = new Set(['install', 'repair', 'service', 'quote']);
    const validPriorities = new Set(['emergency', 'urgent', 'high', 'normal', 'medium', 'low']);
    const validStatuses = new Set(['draft', 'scheduled', 'dispatched', 'on_route', 'in_progress', 'on_site', 'awaiting_parts', 'completed', 'cancelled', 'pending_parts', 'unallocated', 'pending_booking']);
    const customerId = cleanText(prismaData.customerId, 100);
    const siteId = cleanText(prismaData.siteId, 100);
    const equipmentId = cleanText(prismaData.equipmentId, 100);
    const title = cleanText(prismaData.title, 200);
    const description = cleanText(prismaData.description, 10_000);
    const date = cleanText(prismaData.date, 10);
    const time = cleanText(prismaData.time, 5);
    const durationMinutes = Number(prismaData.durationMinutes ?? 120);
    if (!customerId || !title || !description || !isValidDate(date) || !isValidTime(time) || !Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 1_440 || !validSources.has(String(prismaData.source)) || !validTypes.has(String(prismaData.type)) || !validUnits.has(String(prismaData.unitType)) || !validIssues.has(String(prismaData.issue)) || !validPriorities.has(String(prismaData.priority)) || !validStatuses.has(String(prismaData.status))) {
      return NextResponse.json({ error: 'Invalid customer, job details, date, time, or enum value' }, { status: 400 });
    }
    prismaData.customerId = customerId;
    prismaData.title = title;
    prismaData.description = description;
    prismaData.date = date;
    prismaData.time = time;
    prismaData.durationMinutes = durationMinutes;
    const customer = await prisma.customer.findFirst({ where: { id: customerId, archivedAt: null }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    if (siteId) {
      const site = await prisma.serviceSite.findFirst({ where: { id: siteId, customerId }, select: { id: true } });
      if (!site) return NextResponse.json({ error: 'Site does not belong to customer' }, { status: 400 });
    }
    if (equipmentId) {
      const equipment = await prisma.equipment.findFirst({ where: { id: equipmentId, customerId, ...(siteId ? { siteId } : {}) }, select: { id: true } });
      if (!equipment) return NextResponse.json({ error: 'Equipment does not belong to customer/site' }, { status: 400 });
    }
    const assignmentIds = [...(Array.isArray(techIds) ? techIds : []), ...(Array.isArray(coTechIds) ? coTechIds : [])];
    if ((techIds !== undefined && !Array.isArray(techIds)) || (coTechIds !== undefined && !Array.isArray(coTechIds)) || assignmentIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Technician assignments must be arrays' }, { status: 400 });
    }
    if (new Set(assignmentIds).size !== assignmentIds.length || (Array.isArray(techIds) && Array.isArray(coTechIds) && techIds.some((id: string) => coTechIds.includes(id)))) {
      return NextResponse.json({ error: 'A technician cannot be assigned more than once to the same job' }, { status: 400 });
    }
    if (assignmentIds.length) {
      const techCount = await prisma.user.count({ where: { id: { in: assignmentIds }, role: 'tech' } });
      if (techCount !== new Set(assignmentIds).size) return NextResponse.json({ error: 'Assignments must reference technician accounts' }, { status: 400 });
    }

    const recurringData = recurring && typeof recurring === 'object'
      ? {
          interval: Math.max(1, Math.min(120, Number((recurring as { interval?: unknown }).interval) || 1)),
          unit: ['days', 'weeks', 'months', 'years'].includes(String((recurring as { unit?: unknown }).unit)) ? String((recurring as { unit?: unknown }).unit) : 'months',
        }
      : null;
    const jobCardRef = `JC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const job = await prisma.$transaction(async (tx) => {
      if (assignmentIds.length) {
        const start = minutes(time);
        const end = start + durationMinutes;
        const sameDay = await tx.job.findMany({
          where: {
            date,
            status: { notIn: ['cancelled', 'completed'] },
            OR: [{ technicians: { some: { id: { in: assignmentIds } } } }, { coTechnicians: { some: { id: { in: assignmentIds } } } }],
          },
          select: { id: true, jobCardRef: true, time: true, durationMinutes: true },
        });
        const conflict = sameDay.find((existing) => {
          const otherStart = minutes(existing.time);
          return start < otherStart + existing.durationMinutes && end > otherStart;
        });
        if (conflict) throw new SchedulingConflictError(conflict);
      }

      return tx.job.create({
        data: {
          ...(prismaData as Prisma.JobUncheckedCreateInput),
          jobCardRef,
          technicians: techIds?.length ? { connect: techIds.map((tid: string) => ({ id: tid })) } : undefined,
          coTechnicians: coTechIds?.length ? { connect: coTechIds.map((tid: string) => ({ id: tid })) } : undefined,
          recurring: recurringData ? { create: recurringData } : undefined,
        },
        include: {
          customer: { select: safeCustomerSelect },
          technicians: { select: safeUserSelect },
          coTechnicians: { select: safeUserSelect },
          recurring: true,
        }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Push notification to assigned technicians
    if (assignmentIds.length) {
      sendPushToUsers(assignmentIds, {
        title: 'New Job Assigned',
        body: `${job.title} — ${job.customer?.name || ''}`,
        url: '/',
      });
      await Promise.all(job.technicians.map((tech) => sendTechAssignmentEmail({
        to: tech.email,
        technicianName: tech.name,
        customerName: job.customer?.name || 'Customer',
        jobTitle: job.title,
        jobDate: job.date,
        jobTime: job.time,
        jobAddress: job.customer?.address || 'Address not provided',
        jobDescription: job.description,
        customerPhone: job.customer?.phone || undefined,
        jobId: job.jobCardRef,
      })).concat(job.coTechnicians.map((tech) => sendTechAssignmentEmail({
        to: tech.email,
        technicianName: tech.name,
        customerName: job.customer?.name || 'Customer',
        jobTitle: job.title,
        jobDate: job.date,
        jobTime: job.time,
        jobAddress: job.customer?.address || 'Address not provided',
        jobDescription: job.description,
        customerPhone: job.customer?.phone || undefined,
        jobId: job.jobCardRef,
      })))).catch(() => []);
      emitServiceNotification({ event: 'job.technician_assigned', channel: 'email', jobId: job.id, customerId: job.customerId, payload: { jobRef: job.jobCardRef, techIds: assignmentIds } }).catch(() => undefined);
    }

    await auditServiceAction(session, 'create_job', `Created job ${job.jobCardRef}`, job.id);

    return NextResponse.json(jobToClient(job as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    if (error instanceof SchedulingConflictError) {
      return NextResponse.json({ error: error.message, conflict: error.conflict }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Another job was created at the same time. Please retry.' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
