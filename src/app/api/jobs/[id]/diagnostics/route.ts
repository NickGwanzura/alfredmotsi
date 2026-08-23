import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText } from '@/app/lib/serviceAuth';
import { diagnosticsToClient } from '@/app/lib/jobTransform';
import { toPrismaRefrigerantType, toPrismaSystemStatus } from '@/app/lib/refrigerantType';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userRole = session.user.role as string;
    const userId = session.user.id!;
    const accessError = await verifyJobAccess(id, userId, userRole);
    if (accessError) return accessError;

    const diagnostics = await prisma.diagnostics.findUnique({
      where: { jobId: id },
    });

    if (!diagnostics) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(diagnosticsToClient(diagnostics as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['admin', 'tech']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const userRole = session.user.role as string;
    const userId = session.user.id!;
    const accessError = await verifyJobAccess(id, userId, userRole);
    if (accessError) return accessError;

    const body = await request.json();

    const {
      voltage, current, avgTemp, maxTemp, suction, discharge,
      refrigerantType,
      status, notes, deltaT, brand, serial
    } = body;

    const data: Record<string, unknown> = {};
    if (voltage !== undefined) data.voltage = cleanText(voltage, 120);
    if (current !== undefined) data.current = cleanText(current, 120);
    if (avgTemp !== undefined) data.avgTemp = cleanText(avgTemp, 120);
    if (maxTemp !== undefined) data.maxTemp = cleanText(maxTemp, 120);
    if (suction !== undefined) data.suction = cleanText(suction, 120);
    if (discharge !== undefined) data.discharge = cleanText(discharge, 120);
    if (refrigerantType !== undefined) {
      const normalized = toPrismaRefrigerantType(refrigerantType);
      if (!normalized) return NextResponse.json({ error: 'Invalid refrigerant type' }, { status: 400 });
      data.refrigerantType = normalized;
    }
    // Refrigerant movement totals are maintained only by the movement ledger.
    if (status !== undefined) {
      const normalized = toPrismaSystemStatus(status);
      if (!normalized) return NextResponse.json({ error: 'Invalid diagnostics status' }, { status: 400 });
      data.status = normalized;
    }
    if (notes !== undefined) data.notes = cleanText(notes, 5_000) || null;
    if (deltaT !== undefined) data.deltaT = cleanText(deltaT, 120);
    if (brand !== undefined) data.brand = cleanText(brand, 120);
    if (serial !== undefined) data.serial = cleanText(serial, 120);

    const diagnostics = await prisma.diagnostics.upsert({
      where: { jobId: id },
      update: data,
      create: {
        jobId: id,
        ...data,
      },
    });

    return NextResponse.json(diagnosticsToClient(diagnostics as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error saving diagnostics:', error);
    return NextResponse.json({ error: 'Failed to save diagnostics' }, { status: 500 });
  }
}
