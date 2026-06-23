import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

const VALID_STATUSES = new Set(['sent', 'failed', 'skipped']);

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 25, 100);
  const status = searchParams.get('status')?.trim();
  const category = searchParams.get('category')?.trim();
  const recipient = searchParams.get('recipient')?.trim();
  const q = searchParams.get('q')?.trim();
  const since = parseDate(searchParams.get('since'));
  const until = parseDate(searchParams.get('until'));

  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const where: Prisma.EmailDeliveryLogWhereInput = {};
  if (status) where.status = status as Prisma.EmailDeliveryLogWhereInput['status'];
  if (category) where.category = category;
  if (recipient) where.recipient = { contains: recipient, mode: 'insensitive' };
  if (since || until) {
    where.createdAt = {
      ...(since ? { gte: since } : {}),
      ...(until ? { lte: until } : {}),
    };
  }
  if (q) {
    where.OR = [
      { recipient: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { errorMessage: { contains: q, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const [total, logs] = await Promise.all([
    prisma.emailDeliveryLog.count({ where }),
    prisma.emailDeliveryLog.findMany({
      where,
      select: {
        id: true,
        recipient: true,
        recipients: true,
        subject: true,
        category: true,
        status: true,
        resendMessageId: true,
        resendData: true,
        resendError: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    filters: {
      status: status || null,
      category: category || null,
      recipient: recipient || null,
      q: q || null,
      since: since?.toISOString() || null,
      until: until?.toISOString() || null,
    },
  });
}
