import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const allocation = await prisma.fundAllocation.findUnique({
    where: { id },
    include: {
      tech: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      expenses: {
        include: {
          job: { select: { id: true, jobCardRef: true, title: true } },
          recordedBy: { select: { id: true, name: true } },
        },
        orderBy: { recordedAt: 'desc' },
      },
    },
  });

  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  return NextResponse.json(allocation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { amount, status, notes } = await req.json();

  const existing = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  if (amount !== undefined && amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (amount !== undefined) data.amount = amount;
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.fundAllocation.update({
    where: { id },
    data,
    include: {
      tech: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      expenses: {
        include: {
          job: { select: { id: true, jobCardRef: true, title: true } },
          recordedBy: { select: { id: true, name: true } },
        },
        orderBy: { recordedAt: 'desc' },
      },
    },
  });

  return NextResponse.json(updated);
}
