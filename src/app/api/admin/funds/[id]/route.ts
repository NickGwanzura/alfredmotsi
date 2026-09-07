import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { isAdmin } from '@/app/lib/auth/auth';
import { cleanText, positiveNumber } from '@/app/lib/serviceAuth';

const fundInclude = {
  tech: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  expenses: {
    include: {
      job: { select: { id: true, jobCardRef: true, title: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { recordedAt: 'desc' as const },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const allocation = await prisma.fundAllocation.findUnique({
    where: { id },
    include: fundInclude,
  });

  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  // Techs can only view their own funds
  const role = (session.user as any).role;
  const userId = session.user.id!;
  if (!isAdmin(role) && allocation.techId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(allocation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAdmin((session.user as any).role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { name, amount, status, notes } = await req.json();

  const existing = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  // Validate: amount can't go below already spent
  const parsedAmount = amount === undefined ? undefined : positiveNumber(amount);
  if (amount !== undefined && parsedAmount === null) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }
  if (parsedAmount !== undefined && parsedAmount !== null && parsedAmount < existing.spent) {
    return NextResponse.json(
      { error: `Amount cannot be less than the already spent amount ($${existing.spent.toFixed(2)})` },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  let auditReason = '';

  if (name !== undefined) data.name = cleanText(name, 200) || null;
  if (parsedAmount !== undefined && parsedAmount !== null) {
    data.amount = parsedAmount;
    auditReason += ` amount changed from $${existing.amount} to $${parsedAmount}`;
  }
  if (status !== undefined) {
    if (!['active', 'exhausted', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid fund status' }, { status: 400 });
    }
    data.status = status;
    auditReason += ` status changed to ${status}`;
  }
  if (notes !== undefined) data.notes = cleanText(notes, 2_000) || null;
  if (notes !== undefined && notes !== existing.notes) {
    auditReason += ' notes updated';
  }

  const updated = await prisma.fundAllocation.update({
    where: { id },
    data,
    include: fundInclude,
  });

  // Audit log
  if (status === 'closed') {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        userName: (session.user as any).name || 'Admin',
        action: 'close_fund',
        reason: `Fund ${existing.name || id} for ${existing.techId} closed`,
      },
    });
  } else if (auditReason) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        userName: (session.user as any).name || 'Admin',
        action: 'update_fund',
        reason: auditReason.trim(),
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAdmin((session.user as any).role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.fundAllocation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  if (existing.spent > 0) {
    return NextResponse.json({ error: 'Funds with recorded expenses cannot be deleted. Close the fund instead.' }, { status: 400 });
  }

  await prisma.fundAllocation.delete({ where: { id } });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id!,
      userName: (session.user as any).name || 'Admin',
      action: 'delete_expense', // closest match for deleting entire fund
      reason: `Fund allocation ${existing.name || id} ($${existing.amount}) deleted`,
    },
  });

  return NextResponse.json({ success: true });
}
