import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth, authorizeRole, filterFinancialData } from '@/app/lib/auth/auth';
import { jobToClient, jobFromClient } from '@/app/lib/jobTransform';
import { sendPushToUsers } from '@/app/lib/push/server';
import { auditServiceAction, cleanText } from '@/app/lib/serviceAuth';
import { emitServiceNotification } from '@/app/lib/notifications/provider';

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'draft':          ['unallocated', 'scheduled', 'cancelled'],
  'unallocated':    ['scheduled', 'dispatched', 'cancelled'],
  'scheduled':      ['dispatched', 'on-route', 'on_route', 'in-progress', 'in_progress', 'on-site', 'on_site', 'cancelled', 'unallocated'],
  'dispatched':     ['on-route', 'on_route', 'on-site', 'on_site', 'in-progress', 'in_progress', 'cancelled'],
  'on-route':       ['on-site', 'on_site', 'cancelled'],
  'on_route':       ['on-site', 'on_site', 'cancelled'],
  'in-progress':    ['on-site', 'on_site', 'completed', 'pending-parts', 'pending_parts', 'awaiting-parts', 'awaiting_parts', 'cancelled'],
  'in_progress':    ['on-site', 'on_site', 'completed', 'pending-parts', 'pending_parts', 'awaiting-parts', 'awaiting_parts', 'cancelled'],
  'on-site':        ['completed', 'in-progress', 'in_progress', 'pending-parts', 'pending_parts', 'awaiting-parts', 'awaiting_parts', 'cancelled'],
  'on_site':        ['completed', 'in-progress', 'in_progress', 'pending-parts', 'pending_parts', 'awaiting-parts', 'awaiting_parts', 'cancelled'],
  'completed':      ['invoiced', 'cancelled'],
  'pending-parts':  ['scheduled', 'in-progress', 'in_progress', 'on-site', 'on_site', 'cancelled'],
  'pending_parts':  ['scheduled', 'in-progress', 'in_progress', 'on-site', 'on_site', 'cancelled'],
  'awaiting-parts': ['scheduled', 'dispatched', 'in-progress', 'in_progress', 'on-site', 'on_site', 'cancelled'],
  'awaiting_parts': ['scheduled', 'dispatched', 'in-progress', 'in_progress', 'on-site', 'on_site', 'cancelled'],
  'pending-booking':['scheduled', 'cancelled'],
  'pending_booking':['scheduled', 'cancelled'],
  'cancelled':      ['scheduled', 'unallocated'],
};

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

    if (!['owner', 'admin', 'dispatcher', 'accounts', 'sales'].includes(userRole)) {
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

    if (!['owner', 'admin', 'dispatcher'].includes(userRole)) {
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
    const isFieldTech = userRole === 'tech';
    if (isFieldTech) {
      // A technician can update field execution data only; assignment, customer,
      // scheduling, and job classification remain dispatcher/admin controlled.
      for (const key of ['source', 'customerId', 'siteId', 'equipmentId', 'leadId', 'title', 'type', 'unitType', 'issue', 'priority', 'date', 'time', 'durationMinutes']) {
        delete updateData[key];
      }
    }
    if (updateData.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(updateData.date))) {
      return NextResponse.json({ error: 'Invalid job date' }, { status: 400 });
    }
    if (updateData.time !== undefined && !/^\d{2}:\d{2}$/.test(String(updateData.time))) {
      return NextResponse.json({ error: 'Invalid job time' }, { status: 400 });
    }
    if (updateData.customerId || updateData.siteId || updateData.equipmentId) {
      const customerId = cleanText(updateData.customerId || existingJob.customerId, 100);
      const siteId = cleanText(updateData.siteId || existingJob.siteId, 100);
      const equipmentId = cleanText(updateData.equipmentId || existingJob.equipmentId, 100);
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      if (siteId && !await prisma.serviceSite.findFirst({ where: { id: siteId, customerId }, select: { id: true } })) return NextResponse.json({ error: 'Site does not belong to customer' }, { status: 400 });
      if (equipmentId && !await prisma.equipment.findFirst({ where: { id: equipmentId, customerId, ...(siteId ? { siteId } : {}) }, select: { id: true } })) return NextResponse.json({ error: 'Equipment does not belong to customer/site' }, { status: 400 });
    }
    const assignmentIds = [...(Array.isArray(techIds) ? techIds : []), ...(Array.isArray(coTechIds) ? coTechIds : [])];
    if (!isFieldTech && (techIds !== undefined || coTechIds !== undefined)) {
      if ((techIds !== undefined && !Array.isArray(techIds)) || (coTechIds !== undefined && !Array.isArray(coTechIds)) || assignmentIds.some((tid) => typeof tid !== 'string')) return NextResponse.json({ error: 'Technician assignments must be arrays' }, { status: 400 });
      if (assignmentIds.length) {
        const techCount = await prisma.user.count({ where: { id: { in: assignmentIds }, role: 'tech' } });
        if (techCount !== new Set(assignmentIds).size) return NextResponse.json({ error: 'Assignments must reference technician accounts' }, { status: 400 });
      }
    }

    // Validate status transition
    const oldStatus = existingJob.status as string;
    const newStatus = updateData.status as string | undefined;
    if (newStatus && newStatus !== oldStatus) {
      const allowed = ALLOWED_TRANSITIONS[oldStatus];
      if (!allowed || !allowed.includes(newStatus)) {
        return NextResponse.json({
          error: `Cannot transition job from "${oldStatus}" to "${newStatus}". Allowed transitions: ${(allowed || ['none']).join(', ')}`,
        }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const whereClause: any = { id };
      if (_version !== undefined) whereClause.version = _version;

      const job = await tx.job.update({
        where: whereClause,
        data: {
          ...updateData,
          version: { increment: 1 },
          ...(!isFieldTech && techIds && { technicians: { set: techIds.map((tid: string) => ({ id: tid })) } }),
          ...(!isFieldTech && coTechIds && { coTechnicians: { set: coTechIds.map((tid: string) => ({ id: tid })) } }),
        },
        include: {
          customer: true, technicians: true, coTechnicians: true, diagnostics: true,
          comments: true, history: true,
        },
      });

      if (diagnostics) {
        const diagnosticData = Object.fromEntries(
          ['voltage', 'current', 'avgTemp', 'maxTemp', 'suction', 'discharge', 'refrigerantType', 'refrigerantRecovered', 'refrigerantUsed', 'refrigerantReused', 'status', 'notes', 'deltaT', 'brand', 'serial']
            .filter((key) => diagnostics[key] !== undefined)
            .map((key) => [key, diagnostics[key]])
        );
        await tx.diagnostics.upsert({
          where: { jobId: id },
          update: diagnosticData,
          create: { jobId: id, ...diagnosticData },
        });
      }

      // Only touch recurring if it was explicitly sent in the request body
      if ('recurring' in body) {
        if (recurring) {
          const recurringData = {
            interval: Math.max(1, Math.min(120, Number(recurring.interval) || 1)),
            unit: typeof recurring.unit === 'string' && ['days', 'weeks', 'months', 'years'].includes(recurring.unit) ? recurring.unit : 'months',
          };
          await tx.recurringSchedule.upsert({
            where: { jobId: id },
            update: recurringData,
            create: { jobId: id, ...recurringData },
          });
        } else {
          await tx.recurringSchedule.deleteMany({ where: { jobId: id } });
        }
      }

      // Comments and history are managed via their dedicated endpoints
      // Do NOT replace them on job update to prevent data loss

      return await tx.job.findUnique({
        where: { id },
        include: {
          customer: true, technicians: true, coTechnicians: true, diagnostics: true,
          comments: true, history: true, recurring: true,
        },
      });
    });

    // Push to newly assigned techs (those not previously assigned)
    if (!isFieldTech && techIds?.length) {
      const prevTechIds = existingJob.technicians.map((t: any) => t.id);
      const newlyAssigned = techIds.filter((tid: string) => !prevTechIds.includes(tid));
      if (newlyAssigned.length) {
        const jobTitle = (result as any)?.title || 'Job update';
        const custName = (result as any)?.customer?.name || '';
        sendPushToUsers(newlyAssigned, {
          title: 'Job Assigned to You',
          body: `${jobTitle}${custName ? ` — ${custName}` : ''}`,
          url: '/',
        });
      }
    }

    const changedAssignment = !isFieldTech && Array.isArray(techIds) && techIds.some((tid: string) => !existingJob.technicians.some((tech) => tech.id === tid));
    await auditServiceAction(session, changedAssignment ? 'assign_technician' : (newStatus === 'cancelled' ? 'cancel_job' : newStatus === 'dispatched' ? 'dispatch_job' : 'update_job'), `Updated job ${id}${newStatus ? ` to ${newStatus}` : ''}`, id);
    if (newStatus === 'on_route') emitServiceNotification({ event: 'job.on_route', channel: 'whatsapp', jobId: id, payload: { jobId: id } }).catch(() => undefined);
    if (newStatus === 'completed') emitServiceNotification({ event: 'job.completed', channel: 'email', jobId: id, payload: { jobId: id } }).catch(() => undefined);

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

    const forbidden = authorizeRole(session, ['owner', 'admin']);
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
