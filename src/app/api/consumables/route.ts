import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// GET /api/consumables?jobId=X&userId=X
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const userId = searchParams.get('userId');

  const where: Record<string, unknown> = {};
  if (jobId) where.jobId = jobId;
  if (userId) where.recordedBy = userId;

  const consumables = await prisma.consumable.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
  });

  return NextResponse.json(consumables);
}

// POST /api/consumables
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { jobId, type, name, brand, model, quantity, unit, notes } = body;

  if (!jobId || !type || !name || !quantity || !unit) {
    return NextResponse.json({ error: 'jobId, type, name, quantity, and unit are required' }, { status: 400 });
  }

  // Techs can only add consumables to jobs they are assigned to
  const user = session.user as { id: string; role: string };
  if (user.role !== 'admin') {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { technicians: { select: { id: true } }, coTechnicians: { select: { id: true } } },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const assigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === user.id);
    if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const consumable = await prisma.consumable.create({
    data: {
      jobId,
      type,
      name,
      brand: brand || null,
      model: model || null,
      quantity: parseFloat(quantity),
      unit,
      notes: notes || null,
      recordedBy: user.id,
    },
  });

  return NextResponse.json(consumable, { status: 201 });
}
