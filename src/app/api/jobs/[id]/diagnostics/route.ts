import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// GET /api/jobs/[id]/diagnostics - Get job diagnostics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const diagnostics = await prisma.diagnostics.findUnique({
      where: { jobId: id },
    });

    if (!diagnostics) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
  }
}

// POST /api/jobs/[id]/diagnostics - Create or update diagnostics
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Validate job exists
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const {
      voltage, current, avgTemp, maxTemp, suction, discharge,
      refrigerantType, refrigerantRecovered, refrigerantUsed, refrigerantReused,
      status, notes, deltaT, brand, serial
    } = body;

    const data: Record<string, unknown> = {};
    if (voltage !== undefined) data.voltage = voltage;
    if (current !== undefined) data.current = current;
    if (avgTemp !== undefined) data.avgTemp = avgTemp;
    if (maxTemp !== undefined) data.maxTemp = maxTemp;
    if (suction !== undefined) data.suction = suction;
    if (discharge !== undefined) data.discharge = discharge;
    if (refrigerantType !== undefined) data.refrigerantType = refrigerantType;
    if (refrigerantRecovered !== undefined) data.refrigerantRecovered = parseFloat(refrigerantRecovered);
    if (refrigerantUsed !== undefined) data.refrigerantUsed = parseFloat(refrigerantUsed);
    if (refrigerantReused !== undefined) data.refrigerantReused = parseFloat(refrigerantReused);
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (deltaT !== undefined) data.deltaT = deltaT;
    if (brand !== undefined) data.brand = brand;
    if (serial !== undefined) data.serial = serial;

    const diagnostics = await prisma.diagnostics.upsert({
      where: { jobId: id },
      update: data,
      create: {
        jobId: id,
        ...data,
      },
    });

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Error saving diagnostics:', error);
    return NextResponse.json({ error: 'Failed to save diagnostics' }, { status: 500 });
  }
}
