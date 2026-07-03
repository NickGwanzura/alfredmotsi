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

  const allocation = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  const expenses = await prisma.fundExpense.findMany({
    where: { fundId: id },
    include: {
      job: { select: { id: true, jobCardRef: true, title: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { recordedAt: 'desc' },
  });

  return NextResponse.json(expenses);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { description, amount, jobId, receiptRef, notes } = await req.json();

  if (!description || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Description and a positive amount are required' }, { status: 400 });
  }

  const allocation = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  if (allocation.status === 'closed') {
    return NextResponse.json({ error: 'Cannot add expenses to a closed fund' }, { status: 400 });
  }

  if (allocation.spent + amount > allocation.amount) {
    return NextResponse.json({ error: 'Expense would exceed allocated amount' }, { status: 400 });
  }

  // Create the expense and update the allocation spent + status in a transaction
  const [expense] = await prisma.$transaction([
    prisma.fundExpense.create({
      data: {
        fundId: id,
        jobId: jobId || null,
        description,
        amount,
        receiptRef: receiptRef || null,
        notes: notes || null,
        recordedById: session.user.id!,
      },
      include: {
        job: { select: { id: true, jobCardRef: true, title: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.fundAllocation.update({
      where: { id },
      data: {
        spent: { increment: amount },
      },
    }),
  ]);

  // Check if fund is now exhausted and update status
  const updated = await prisma.fundAllocation.findUnique({ where: { id } });
  if (updated && updated.spent >= updated.amount && updated.status === 'active') {
    await prisma.fundAllocation.update({
      where: { id },
      data: { status: 'exhausted' },
    });
  }

  // Update the status field on the returned expense
  const finalExpense = await prisma.fundExpense.findUnique({
    where: { id: expense.id },
    include: {
      job: { select: { id: true, jobCardRef: true, title: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(finalExpense, { status: 201 });
}
