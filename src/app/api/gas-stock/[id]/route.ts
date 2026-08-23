import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, nonNegativeNumber, positiveNumber } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { toRefrigerantLabel } from '@/app/lib/refrigerantType';
import { Prisma, type GasStockKind } from '@prisma/client';

const STOCK_KINDS = new Set<GasStockKind>(['virgin', 'recovered', 'waste']);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, ['owner', 'admin']);
  if (forbidden) return forbidden;

  try {
  const { id } = await params;
  const body = await request.json();
  const reason = cleanText(body.reason, 500);
  if (!reason) return NextResponse.json({ error: 'A stock correction reason is required' }, { status: 400 });

  const existing = await prisma.gasStockItem.findUnique({
    where: { id },
    include: { usageRecords: { where: { quantityKg: { gt: 0 } }, select: { id: true }, take: 1 } },
  });
  if (!existing) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
  if (existing.retiredAt) return NextResponse.json({ error: 'Retired cylinders are immutable and cannot be corrected' }, { status: 409 });

  const expectedVersion = Number(body.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return NextResponse.json({ error: 'Refresh stock before correcting it' }, { status: 428 });
  }
  const gasType = toRefrigerantLabel(body.gasType === undefined ? existing.gasType : cleanText(body.gasType, 60));
  const quantity = body.quantity === undefined ? existing.quantity : positiveNumber(body.quantity);
  const remaining = body.remaining === undefined ? existing.remaining : nonNegativeNumber(body.remaining);
  const unit = normalizeGasUnit(body.unit === undefined ? existing.unit : body.unit);
  const stockKind = cleanText(body.stockKind === undefined ? existing.stockKind : body.stockKind, 20) as GasStockKind;
  const brand = body.brand === undefined ? existing.brand : cleanText(body.brand, 120);
  const supplier = body.supplier === undefined ? existing.supplier : cleanText(body.supplier, 180);
  const serialNumber = body.serialNumber === undefined ? existing.serialNumber : cleanText(body.serialNumber, 120) || null;
  const tareWeightKg = body.tareWeightKg === undefined ? existing.tareWeightKg
    : (body.tareWeightKg === null || body.tareWeightKg === '' ? null : nonNegativeNumber(body.tareWeightKg));
  const certificationExpiresAt = body.certificationExpiresAt === undefined
    ? existing.certificationExpiresAt
    : (body.certificationExpiresAt ? new Date(String(body.certificationExpiresAt)) : null);
  if (!gasType || quantity === null || remaining === null || remaining > quantity || !unit || !brand || !supplier || !serialNumber || !STOCK_KINDS.has(stockKind)
    || (body.tareWeightKg !== undefined && body.tareWeightKg !== null && body.tareWeightKg !== '' && tareWeightKg === null)
    || (certificationExpiresAt && Number.isNaN(certificationExpiresAt.getTime()))) {
    return NextResponse.json({ error: 'Provide valid gas type, unit, brand, supplier, capacity, and remaining balance' }, { status: 400 });
  }
  if (unit !== existing.unit) {
    return NextResponse.json({ error: 'A cylinder unit cannot be changed. Create a new cylinder using the correct unit.' }, { status: 409 });
  }
  const hasMaterialHistory = existing.usageRecords.length > 0;
  if (hasMaterialHistory && (gasType !== existing.gasType || quantity !== existing.quantity || stockKind !== existing.stockKind)) {
    return NextResponse.json({ error: 'Gas type, capacity, and cylinder type are locked after the first real movement. Use a transfer or create a new cylinder.' }, { status: 409 });
  }

  const actorName = session.user.name || 'Unknown';
  const delta = remaining - existing.remaining;
  const { date, time } = formatHarareDateTime();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.gasStockItem.updateMany({
      where: { id, version: expectedVersion },
      data: {
        gasType, brand, supplier, unit, quantity, remaining, stockKind,
        serialNumber, tareWeightKg, certificationExpiresAt,
        ...(body.supplierRef !== undefined && { supplierRef: cleanText(body.supplierRef, 120) }),
        ...(body.notes !== undefined && { notes: cleanText(body.notes, 2_000) || null }),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) return null;

    const stock = await tx.gasStockItem.findUniqueOrThrow({ where: { id } });
    if (serialNumber && serialNumber !== existing.serialNumber) {
      await tx.gasUsageRecord.updateMany({ where: { stockId: id, stockSerialNumber: null }, data: { stockSerialNumber: serialNumber } });
    }
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
          stockSerialNumber: serialNumber,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: session.user.id!, userName: actorName, action: 'update_gas_stock',
        reason: `Stock ${id}: balance ${existing.remaining} → ${remaining} ${unit}; gas ${existing.gasType || 'unset'} → ${gasType}; kind ${existing.stockKind} → ${stockKind}; serial ${existing.serialNumber || 'unset'} → ${serialNumber}; certification ${existing.certificationExpiresAt?.toISOString() || 'unset'} → ${certificationExpiresAt?.toISOString() || 'unset'}; tare ${existing.tareWeightKg ?? 'unset'} → ${tareWeightKg ?? 'unset'}; ${reason}`,
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Cylinder serial number is already in use' }, { status: 409 });
    }
    console.error('Error correcting gas stock:', error);
    return NextResponse.json({ error: 'Failed to correct gas stock' }, { status: 500 });
  }
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
  try {
    const execute = () => prisma.$transaction(async (tx) => {
      const existing = await tx.gasStockItem.findUnique({
        where: { id },
        include: { _count: { select: { usageRecords: true } } },
      });
      if (!existing) return { status: 'not_found' as const };
      if (existing.retiredAt) return { status: 'retired' as const };
      if (existing._count.usageRecords > 0) return { status: 'has_history' as const };
      const lifecycleCount = await tx.gasLifecycleRequest.count({
        where: { OR: [{ sourceStockId: id }, { destinationStockId: id }] },
      });
      if (lifecycleCount > 0) return { status: 'has_history' as const };
      await tx.gasStockItem.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: session.user.id!, userName: session.user.name || 'Unknown', action: 'delete_gas_stock',
          reason: `Deleted unused gas stock ${existing.id} (${existing.gasType})`,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      });
      return { status: 'deleted' as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    let result: Awaited<ReturnType<typeof execute>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { result = await execute(); break; }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (result?.status === 'not_found') return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
    if (result?.status === 'retired') return NextResponse.json({ error: 'Retired cylinders are immutable and cannot be deleted' }, { status: 409 });
    if (result?.status === 'has_history') return NextResponse.json({ error: 'This cylinder has movement history and cannot be deleted' }, { status: 409 });
    if (result?.status !== 'deleted') throw new Error('Cylinder deletion did not complete');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'This cylinder gained movement history and cannot be deleted' }, { status: 409 });
    }
    console.error('Error deleting gas stock:', error);
    return NextResponse.json({ error: 'Failed to delete gas stock' }, { status: 500 });
  }
}
