import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allocations = await prisma.fundAllocation.findMany({
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
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(allocations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { amount, techId, notes } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  if (!techId) {
    return NextResponse.json({ error: 'Technician is required' }, { status: 400 });
  }

  const tech = await prisma.user.findUnique({ where: { id: techId } });
  if (!tech || tech.role !== 'tech') {
    return NextResponse.json({ error: 'Invalid technician' }, { status: 400 });
  }

  const allocation = await prisma.fundAllocation.create({
    data: {
      amount,
      techId,
      createdById: session.user.id!,
      notes: notes || null,
    },
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

  return NextResponse.json(allocation, { status: 201 });
}
