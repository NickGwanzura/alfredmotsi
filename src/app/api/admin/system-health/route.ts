import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { isEmailEnabled } from '@/app/lib/email/resend';

async function countSafely(name: string, count: () => Promise<number>) {
  try {
    return { name, count: await count(), ok: true };
  } catch (error) {
    return {
      name,
      count: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const checkedAt = new Date();
  let database = { ok: true, latencyMs: 0, error: null as string | null };
  const dbStart = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true, latencyMs: Date.now() - dbStart, error: null };
  } catch (error) {
    database = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const tableCounts = await Promise.all([
    countSafely('users', () => prisma.user.count()),
    countSafely('customers', () => prisma.customer.count()),
    countSafely('jobs', () => prisma.job.count()),
    countSafely('gasStock', () => prisma.gasStockItem.count()),
    countSafely('gasUsage', () => prisma.gasUsageRecord.count()),
    countSafely('crmRecords', () => prisma.cRMRecord.count()),
    countSafely('consumables', () => prisma.consumable.count()),
    countSafely('auditLogs', () => prisma.auditLog.count()),
    countSafely('emailDeliveryLogs', () => prisma.emailDeliveryLog.count()),
  ]);

  const [recentEmailFailures, recentAuditLogs] = await Promise.all([
    prisma.emailDeliveryLog.findMany({
      where: { status: 'failed' },
      select: {
        id: true,
        recipient: true,
        subject: true,
        category: true,
        status: true,
        errorMessage: true,
        resendError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []),
    prisma.auditLog.findMany({
      select: {
        id: true,
        userId: true,
        userName: true,
        action: true,
        jobId: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []),
  ]);

  return NextResponse.json({
    ok: database.ok,
    checkedAt: checkedAt.toISOString(),
    database,
    email: {
      configured: isEmailEnabled(),
      fromConfigured: Boolean(process.env.FROM_EMAIL),
    },
    tableCounts,
    recentEmailFailures,
    recentAuditLogs,
  });
}
