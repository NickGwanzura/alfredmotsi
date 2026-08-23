import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, nonNegativeNumber, positiveNumber } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { toRefrigerantLabel } from '@/app/lib/refrigerantType';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, ['owner', 'admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();
  const reason = cleanText(body.reason, 500);
  if (!reason) return NextResponse.json({ error: 'A stock correction reason is required' }, { status: 400 });

  const existing = await prisma.gasStockItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });

  const expectedVersion = Number(body.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return NextResponse.json({ error: 'Refresh stock before correcting it' }, { status: 428 });
  }
  const gasType = toRefrigerantLabel(body.gasType === undefined ? existing.gasType : cleanText(body.gasType, 60));
  const quantity = body.quantity === undefined ? existing.quantity : positiveNumber(body.quantity);
  const remaining = body.remaining === undefined ? existing.remaining : nonNegativeNumber(body.remaining);
  const unit = normalizeGasUnit(body.unit === undefined ? existing.unit : body.unit);
  const brand = body.brand === undefined ? existing.brand : cleanText(body.brand, 120);
  const supplier = body.supplier === undefined ? existing.supplier : cleanText(body.supplier, 180);
  if (!gasType || quantity === null || remaining === null || remaining > quantity || !unit || !brand || !supplier) {
    return NextResponse.json({ error: 'Provide valid gas type, unit, brand, supplier, capacity, and remaining balance' }, { status: 400 });
  }

  const actorName = session.user.name || 'Unknown';
  const delta = remaining - existing.remaining;
  const { date, time } = formatHarareDateTime();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.gasStockItem.updateMany({
      where: { id, version: expectedVersion },
      data: {
        gasType, brand, supplier, unit, quantity, remaining,
        ...(body.supplierRef !== undefined && { supplierRef: cleanText(body.supplierRef, 120) }),
        ...(body.notes !== undefined && { notes: cleanText(body.notes, 2_000) || null }),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) return null;

    const stock = await tx.gasStockItem.findUniqueOrThrow({ where: { id } });
    if (delta !== 0) {
      await tx.gasUsageRecord.create({
        data: {
          stockId: id,
          gasType,
          quantityUsed: Math.abs(delta),
          quantityKg: gasQuantityToKg(Math.abs(delta), unit),
          unit,
          stockDelta: delta,
          stockBalanceAfter: remaining,
          movementType: 'adjustment',
          usedBy: session.user.id!,
          usedByName: actorName,
          jobId: null,
          customer: 'Stock correction',
          date,
          time,
          purpose: reason,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: session.user.id!, userName: actorName, action: 'update_gas_stock',
        reason: `Stock ${id}: ${existing.remaining} → ${remaining} ${unit}; ${reason}`,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });
    return stock;
  });

  if (!result) {
    return NextResponse.json({ error: 'Stock changed while you were editing it. Refresh and retry.' }, { status: 409 });
  }
  return NextResponse.json(result);
}

export const PATCH = PUT;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, ['owner', 'admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await prisma.gasStockItem.findUnique({
    where: { id },
    include: { _count: { select: { usageRecords: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
  if (existing._count.usageRecords > 0) {
    return NextResponse.json({ error: 'This cylinder has movement history and cannot be deleted' }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.gasStockItem.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: session.user.id!, userName: session.user.name || 'Unknown', action: 'delete_gas_stock',
        reason: `Deleted unused gas stock ${existing.id} (${existing.gasType})`,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });
  });
  return NextResponse.json({ success: true });
}
