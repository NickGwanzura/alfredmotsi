import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { OPERATIONS_ROLES, FINANCE_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function GET() {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const alarms = await prisma.inventoryStockAlarm.findMany({
    where: { status: 'open' },
    include: {
      item: { select: { id: true, name: true, category: true, stockLevel: true, unit: true } },
      job: { select: { id: true, jobCardRef: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(alarms);
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const alarmId = typeof body.id === 'string' ? body.id : '';
  if (!alarmId) return NextResponse.json({ error: 'Alarm id is required' }, { status: 400 });
  const alarm = await prisma.inventoryStockAlarm.update({
    where: { id: alarmId },
    data: { status: 'resolved', resolvedAt: new Date() },
  }).catch(() => null);
  if (!alarm) return NextResponse.json({ error: 'Alarm not found' }, { status: 404 });
  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      userName: session!.user.name || 'Unknown',
      action: 'adjust_stock',
      reason: `Resolved inventory stock alarm ${alarm.id}`,
      jobId: alarm.jobId,
    },
  }).catch(() => undefined);
  return NextResponse.json(alarm);
}
