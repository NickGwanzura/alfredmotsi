import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
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
