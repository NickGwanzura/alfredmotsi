import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { isAdmin } from '@/app/lib/auth/auth';

const expenseInclude = {
  job: { select: { id: true, jobCardRef: true, title: true } },
  recordedBy: { select: { id: true, name: true } },
};

function canAccessFund(role: string, techId: string, userId: string): boolean {
  return isAdmin(role) || techId === userId;
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
  const parsedAmount = Number(amount);
  const cleanDescription = typeof description === 'string' ? description.trim().slice(0, 500) : '';
  const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 2_000) : null;

  if (!cleanDescription || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100_000_000) {
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

  if (allocation.spent + parsedAmount > allocation.amount) {
    return NextResponse.json({ error: 'Expense would exceed allocated amount' }, { status: 400 });
  }

  // Create expense and update spent in transaction
  const [expense] = await prisma.$transaction([
    prisma.fundExpense.create({
      data: {
        fundId: id,
        jobId: jobId || null,
        description: cleanDescription,
        amount: parsedAmount,
        receiptRef: receiptRef || null,
        receiptDataUrl: typeof receiptDataUrl === 'string' && receiptDataUrl.length <= 8_000_000 && (/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(receiptDataUrl) || /^https:\/\//i.test(receiptDataUrl)) ? receiptDataUrl : null,
        notes: cleanNotes,
        recordedById: userId,
      },
      include: expenseInclude,
    }),
    prisma.fundAllocation.update({
      where: { id },
      data: { spent: { increment: parsedAmount } },
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
      reason: `$${parsedAmount} — ${cleanDescription}${jobId ? ' (linked to job)' : ''}`,
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
  if (!isAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Calculate the spent delta
  const oldAmount = Number(expense.amount);
  const newAmount = amount !== undefined ? Number(amount) : oldAmount;
  if (!Number.isFinite(newAmount) || newAmount <= 0 || newAmount > 100_000_000) {
    return NextResponse.json({ error: 'Amount must be positive and no greater than 100,000,000' }, { status: 400 });
  }
  const spentDelta = newAmount - oldAmount;

  // Validate: spending cap
  if (spentDelta > 0 && (expense.fund.spent + spentDelta > expense.fund.amount)) {
    return NextResponse.json({ error: 'Updated expense would exceed allocated amount' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (description !== undefined) {
    const cleanDescription = typeof description === 'string' ? description.trim().slice(0, 500) : '';
    if (!cleanDescription) return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    data.description = cleanDescription;
  }
  if (amount !== undefined) data.amount = newAmount;
  if (jobId !== undefined) data.jobId = jobId || null;
  if (receiptRef !== undefined) data.receiptRef = receiptRef || null;
  if (receiptDataUrl !== undefined) data.receiptDataUrl = typeof receiptDataUrl === 'string' && receiptDataUrl.length <= 8_000_000 && (/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(receiptDataUrl) || /^https:\/\//i.test(receiptDataUrl)) ? receiptDataUrl : null;
  if (notes !== undefined) data.notes = typeof notes === 'string' ? notes.trim().slice(0, 2_000) || null : null;

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
  if (!isAdmin(role)) {
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
