import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

async function verifyJobAccess(jobId: string, userId: string, userRole: string): Promise<NextResponse | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { technicians: { select: { id: true } }, coTechnicians: { select: { id: true } } },
  });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (!isAdmin(userRole)) {
    const assigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === userId);
    if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admins and assigned technicians can clock in/out of a job.
  const forbidden = authorizeRole(session, ['admin', 'tech']);
  if (forbidden) return forbidden;

  const { id } = await params;

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const accessError = await verifyJobAccess(id, userId, userRole);
  if (accessError) return accessError;
  const { action, gps, latitude: _lat, longitude: _lng, accuracy: _acc } = await req.json();
  const latitude = gps?.lat ?? _lat;
  const longitude = gps?.lng ?? _lng;
  const accuracy = gps?.accuracy ?? _acc;
  if (action !== 'in' && action !== 'out') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = action === 'in'
    ? { clockIn: now, status: 'on-site' }
    : { clockOut: now, status: (job.status as string) === 'on-site' ? 'completed' : job.status };

  const updated = await prisma.job.update({ where: { id }, data: updateData });

  // Log GPS to audit
  if (latitude && longitude) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? 'Unknown',
        action: action === 'in' ? 'edit_job' : 'complete_job',
        jobId: id,
        latitude,
        longitude,
        accuracy,
      },
    });
  }

  return NextResponse.json(updated);
}
