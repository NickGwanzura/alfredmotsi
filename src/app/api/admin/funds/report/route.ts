import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { isAdmin } from '@/app/lib/auth/auth';
import { makeCsv } from '@/app/lib/csv';

function parseDate(value: string | null, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin((session.user as { role?: string }).role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromValue = url.searchParams.get('from');
  const toValue = url.searchParams.get('to');
  const from = parseDate(fromValue);
  const to = parseDate(toValue, true);
  if ((fromValue && !from) || (toValue && !to)) {
    return NextResponse.json({ error: 'Dates must use YYYY-MM-DD format' }, { status: 400 });
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: 'The start date must be before the end date' }, { status: 400 });
  }

  const techId = url.searchParams.get('techId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  if (status && !['active', 'exhausted', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid fund status' }, { status: 400 });
  }

  const createdAt = from || to ? {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  } : undefined;

  const allocations = await prisma.fundAllocation.findMany({
    where: {
      ...(techId ? { techId } : {}),
      ...(status ? { status: status as 'active' | 'exhausted' | 'closed' } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
    include: {
      tech: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
      expenses: {
        where: {
          ...(from || to ? { recordedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          } } : {}),
        },
        include: {
          job: { select: { jobCardRef: true, title: true } },
          recordedBy: { select: { name: true } },
        },
        orderBy: { recordedAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows: unknown[][] = [
    ['Splash Air Funds Report'],
    ['Period from', fromValue || 'All time', 'Period to', toValue || 'All time'],
    [],
    ['ALLOCATIONS'],
    ['Allocation date', 'Fund', 'Technician', 'Technician email', 'Allocated', 'Spent (period)', 'Balance', 'Status', 'Created by', 'Notes'],
  ];

  for (const allocation of allocations) {
    const periodSpent = allocation.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    rows.push([
      allocation.createdAt.toISOString(),
      allocation.name || '',
      allocation.tech.name,
      allocation.tech.email || '',
      allocation.amount.toFixed(2),
      periodSpent.toFixed(2),
      (allocation.amount - allocation.spent).toFixed(2),
      allocation.status,
      allocation.createdBy.name,
      allocation.notes || '',
    ]);
  }

  rows.push([], ['EXPENSES'], ['Expense date', 'Fund', 'Technician', 'Description', 'Amount', 'Job reference', 'Job title', 'Receipt reference', 'Recorded by', 'Notes']);
  for (const allocation of allocations) {
    for (const expense of allocation.expenses) {
      rows.push([
        expense.recordedAt.toISOString(),
        allocation.name || '',
        allocation.tech.name,
        expense.description,
        expense.amount.toFixed(2),
        expense.job?.jobCardRef || '',
        expense.job?.title || '',
        expense.receiptRef || '',
        expense.recordedBy.name,
        expense.notes || '',
      ]);
    }
  }

  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const spentTotal = allocations.reduce((sum, allocation) => sum + allocation.expenses.reduce((inner, expense) => inner + expense.amount, 0), 0);
  rows.push([], ['TOTALS', '', '', '', allocatedTotal.toFixed(2), spentTotal.toFixed(2), (allocatedTotal - spentTotal).toFixed(2)]);

  const csv = `${makeCsv(rows)}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="splash-air-funds-report-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
