import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

const expenseInclude = {
  job: { select: { id: true, jobCardRef: true, title: true } },
  recordedBy: { select: { id: true, name: true } },
};

function canAccessFund(role: string, techId: string, userId: string): boolean {
  return role === 'admin' || techId === userId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const allocation = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  const role = (session.user as any).role;
  const userId = session.user.id!;
  if (!canAccessFund(role, allocation.techId, userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const expenses = await prisma.fundExpense.findMany({
    where: { fundId: id },
    include: expenseInclude,
    orderBy: { recordedAt: 'desc' },
  });

  return NextResponse.json(expenses);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { description, amount, jobId, receiptRef, receiptDataUrl, notes } = await req.json();

  if (!description || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Description and a positive amount are required' }, { status: 400 });
  }

  const allocation = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  // Both admin and the assigned tech can record expenses
  const role = (session.user as any).role;
  const userId = session.user.id!;
  if (!canAccessFund(role, allocation.techId, userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (allocation.status === 'closed') {
    return NextResponse.json({ error: 'Cannot add expenses to a closed fund' }, { status: 400 });
  }

  if (allocation.spent + amount > allocation.amount) {
    return NextResponse.json({ error: 'Expense would exceed allocated amount' }, { status: 400 });
  }

  // Create expense and update spent in transaction
  const [expense] = await prisma.$transaction([
    prisma.fundExpense.create({
      data: {
        fundId: id,
        jobId: jobId || null,
        description,
        amount,
        receiptRef: receiptRef || null,
        receiptDataUrl: receiptDataUrl || null,
        notes: notes || null,
        recordedById: userId,
      },
      include: expenseInclude,
    }),
    prisma.fundAllocation.update({
      where: { id },
      data: { spent: { increment: amount } },
    }),
  ]);

  // Auto-exhaust if spent >= amount
  const updated = await prisma.fundAllocation.findUnique({ where: { id } });
  if (updated && updated.spent >= updated.amount && updated.status === 'active') {
    await prisma.fundAllocation.update({
      where: { id },
      data: { status: 'exhausted' },
    });
  }

  const finalExpense = await prisma.fundExpense.findUnique({
    where: { id: expense.id },
    include: expenseInclude,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userName: (session.user as any).name || 'User',
      action: 'record_expense',
      jobId: jobId || null,
      reason: `$${amount} — ${description}${jobId ? ' (linked to job)' : ''}`,
    },
  });

  return NextResponse.json(finalExpense, { status: 201 });
}

// PATCH /api/admin/funds/[id]/expenses — update an expense
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Parse { expenseId, ...fields } from body — expenseId is required
  const body = await req.json();
  const { expenseId, description, amount, jobId, receiptRef, receiptDataUrl, notes } = body;

  if (!expenseId) {
    return NextResponse.json({ error: 'expenseId is required' }, { status: 400 });
  }

  // Verify expense exists and belongs to this fund
  const expense = await prisma.fundExpense.findUnique({
    where: { id: expenseId },
    include: { fund: { select: { techId: true, spent: true, amount: true } } },
  });

  if (!expense || expense.fundId !== id) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Auth check
  const role = (session.user as any).role;
  const userId = session.user.id!;
  if (!canAccessFund(role, expense.fund.techId, userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Calculate the spent delta
  const oldAmount = expense.amount;
  const newAmount = amount !== undefined ? amount : oldAmount;
  const spentDelta = newAmount - oldAmount;

  // Validate: spending cap
  if (spentDelta > 0 && (expense.fund.spent + spentDelta > expense.fund.amount)) {
    return NextResponse.json({ error: 'Updated expense would exceed allocated amount' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (description !== undefined) data.description = description;
  if (amount !== undefined && amount > 0) data.amount = amount;
  if (jobId !== undefined) data.jobId = jobId || null;
  if (receiptRef !== undefined) data.receiptRef = receiptRef || null;
  if (receiptDataUrl !== undefined) data.receiptDataUrl = receiptDataUrl || null;
  if (notes !== undefined) data.notes = notes || null;

  // Update expense and spent in transaction
  await prisma.$transaction([
    prisma.fundExpense.update({
      where: { id: expenseId },
      data,
    }),
    prisma.fundAllocation.update({
      where: { id },
      data: { spent: { increment: spentDelta } },
    }),
  ]);

  // Recalculate status
  const updatedFund = await prisma.fundAllocation.findUnique({ where: { id } });
  if (updatedFund) {
    if (updatedFund.spent >= updatedFund.amount && updatedFund.status === 'active') {
      await prisma.fundAllocation.update({ where: { id }, data: { status: 'exhausted' } });
    } else if (updatedFund.spent < updatedFund.amount && updatedFund.status === 'exhausted') {
      await prisma.fundAllocation.update({ where: { id }, data: { status: 'active' } });
    }
  }

  const finalExpense = await prisma.fundExpense.findUnique({
    where: { id: expenseId },
    include: expenseInclude,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userName: (session.user as any).name || 'User',
      action: 'update_expense',
      jobId: finalExpense?.jobId || null,
      reason: `Updated expense: ${finalExpense?.description} ($${oldAmount} → $${newAmount})`,
    },
  });

  return NextResponse.json(finalExpense);
}

// DELETE /api/admin/funds/[id]/expenses — delete an expense
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Parse expenseId from body or query
  const url = new URL(req.url);
  const expenseId = url.searchParams.get('expenseId') || (await req.json().catch(() => ({}))).expenseId;

  if (!expenseId) {
    return NextResponse.json({ error: 'expenseId is required' }, { status: 400 });
  }

  const expense = await prisma.fundExpense.findUnique({
    where: { id: expenseId },
    include: { fund: { select: { techId: true } } },
  });

  if (!expense || expense.fundId !== id) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Auth check
  const role = (session.user as any).role;
  const userId = session.user.id!;
  if (!canAccessFund(role, expense.fund.techId, userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete expense and decrement spent in transaction
  await prisma.$transaction([
    prisma.fundExpense.delete({ where: { id: expenseId } }),
    prisma.fundAllocation.update({
      where: { id },
      data: { spent: { decrement: expense.amount } },
    }),
  ]);

  // Recalculate status
  const updatedFund = await prisma.fundAllocation.findUnique({ where: { id } });
  if (updatedFund && updatedFund.spent < updatedFund.amount && updatedFund.status === 'exhausted') {
    await prisma.fundAllocation.update({ where: { id }, data: { status: 'active' } });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userName: (session.user as any).name || 'User',
      action: 'delete_expense',
      jobId: expense.jobId || null,
      reason: `Deleted expense: ${expense.description} ($${expense.amount})`,
    },
  });

  return NextResponse.json({ success: true });
}
