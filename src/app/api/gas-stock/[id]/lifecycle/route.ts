import { NextRequest, NextResponse } from 'next/server';
import { Prisma, RefrigerantMovementType } from '@prisma/client';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';

const ACTIONS = new Set(['lost', 'disposed', 'transfer', 'retire']);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, ['owner', 'admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = cleanText(body.action, 30);
  const reason = cleanText(body.reason, 500);
  const destinationStockId = cleanText(body.destinationStockId, 100);
  const clientRequestId = cleanText(body.clientRequestId, 100) || null;
  const quantity = Number(body.quantity);
  const expectedVersion = Number(body.expectedVersion);
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;
  if (!ACTIONS.has(action) || !reason || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return NextResponse.json({ error: 'Action, current stock version, and reason are required' }, { status: 400 });
  }
  if (action !== 'retire' && (!Number.isFinite(quantity) || quantity <= 0)) {
    return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
  }
  if (action === 'transfer' && (!destinationStockId || destinationStockId === id)) {
    return NextResponse.json({ error: 'Select a different destination cylinder' }, { status: 400 });
  }

  try {
    const execute = () => prisma.$transaction(async (tx) => {
      if (clientRequestId) {
        const replay = await tx.gasUsageRecord.findUnique({ where: { clientRequestId } });
        if (replay) {
          const expectedType = action === 'lost' ? 'lost' : action === 'disposed' ? 'disposed' : 'transfer_out';
          if (action === 'retire' || replay.stockId !== id || replay.movementType !== expectedType
            || replay.quantityUsed !== quantity || replay.purpose !== reason) {
            throw Object.assign(new Error('request conflict'), { code: 'IDEMPOTENCY_CONFLICT' });
          }
          return { movement: replay, replayed: true };
        }
      }
      const source = await tx.gasStockItem.findUnique({ where: { id } });
      if (!source) throw Object.assign(new Error('not found'), { code: 'NOT_FOUND' });
      if (source.version !== expectedVersion) throw Object.assign(new Error('version'), { code: 'VERSION' });
      if (source.retiredAt) throw Object.assign(new Error('retired'), { code: 'RETIRED' });
      const unit = normalizeGasUnit(source.unit);
      if (!unit) throw Object.assign(new Error('unit'), { code: 'INVALID' });

      if (action === 'retire') {
        if (source.remaining !== 0) throw Object.assign(new Error('balance'), { code: 'NOT_EMPTY' });
        const stock = await tx.gasStockItem.update({ where: { id }, data: { retiredAt: new Date(), version: { increment: 1 } } });
        await tx.auditLog.create({ data: { userId: session.user.id!, userName: session.user.name || 'Unknown', action: 'update_gas_stock', reason: `Retired cylinder ${source.serialNumber || id}: ${reason}`, ipAddress, userAgent } });
        return { stock, replayed: false };
      }

      const sourceUpdated = await tx.gasStockItem.updateMany({
        where: { id, version: expectedVersion, remaining: { gte: quantity }, retiredAt: null },
        data: { remaining: { decrement: quantity }, version: { increment: 1 } },
      });
      if (sourceUpdated.count !== 1) throw Object.assign(new Error('stock conflict'), { code: 'STOCK_CONFLICT' });
      const afterSource = await tx.gasStockItem.findUniqueOrThrow({ where: { id } });
      const { date, time } = formatHarareDateTime();
      const actorName = session.user.name || 'Unknown';
      const movementType: RefrigerantMovementType = action === 'lost' ? 'lost' : action === 'disposed' ? 'disposed' : 'transfer_out';
      const movement = await tx.gasUsageRecord.create({ data: {
        stockId: id, gasType: source.gasType, quantityUsed: quantity, quantityKg: gasQuantityToKg(quantity, unit), unit,
        stockDelta: -quantity, stockBalanceAfter: afterSource.remaining, movementType,
        usedBy: session.user.id!, usedByName: actorName, customer: 'Cylinder lifecycle', date, time, purpose: reason,
        clientRequestId,
        stockSerialNumber: source.serialNumber,
      } });
      if (source.remaining > source.quantity * 0.2 && afterSource.remaining <= source.quantity * 0.2) {
        await tx.notificationEvent.create({ data: {
          event: 'gas.low_stock', channel: 'internal', referenceId: id, status: 'pending',
          payload: { stockId: id, gasType: source.gasType, serialNumber: source.serialNumber, remaining: afterSource.remaining, unit, capacity: source.quantity },
        } });
      }

      if (action === 'transfer') {
        const destination = await tx.gasStockItem.findUnique({ where: { id: destinationStockId! } });
        if (!destination || destination.retiredAt || destination.gasType !== source.gasType || destination.unit !== source.unit) {
          throw Object.assign(new Error('destination'), { code: 'DESTINATION' });
        }
        const destinationUpdated = await tx.gasStockItem.updateMany({
          where: { id: destination.id, version: destination.version, remaining: { lte: destination.quantity - quantity }, retiredAt: null },
          data: { remaining: { increment: quantity }, version: { increment: 1 } },
        });
        if (destinationUpdated.count !== 1) throw Object.assign(new Error('destination capacity'), { code: 'DESTINATION' });
        const afterDestination = await tx.gasStockItem.findUniqueOrThrow({ where: { id: destination.id } });
        await tx.gasUsageRecord.create({ data: {
          stockId: destination.id, gasType: destination.gasType, quantityUsed: quantity, quantityKg: gasQuantityToKg(quantity, unit), unit,
          stockDelta: quantity, stockBalanceAfter: afterDestination.remaining, movementType: 'transfer_in',
          usedBy: session.user.id!, usedByName: actorName, customer: 'Cylinder lifecycle', date, time,
          purpose: `Transfer from ${source.serialNumber || source.id}: ${reason}`,
          clientRequestId: clientRequestId ? `${clientRequestId}:in` : null,
          stockSerialNumber: destination.serialNumber,
        } });
      }

      await tx.auditLog.create({ data: {
        userId: session.user.id!, userName: actorName, action: 'create_gas_movement',
        reason: `${action}: ${quantity} ${unit} from ${source.serialNumber || id}${destinationStockId ? ` to ${destinationStockId}` : ''}; ${reason}`,
        ipAddress, userAgent,
      } });
      return { movement, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    let result: Awaited<ReturnType<typeof execute>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { result = await execute(); break; }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (!result) throw new Error('Lifecycle transaction did not complete');
    return NextResponse.json(result, { status: result.replayed ? 200 : 201, headers: result.replayed ? { 'Idempotent-Replayed': 'true' } : undefined });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'NOT_FOUND') return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 });
    if (code === 'VERSION' || code === 'STOCK_CONFLICT') return NextResponse.json({ error: 'Cylinder changed while you were editing it. Refresh and retry.' }, { status: 409 });
    if (code === 'RETIRED') return NextResponse.json({ error: 'Cylinder is already retired' }, { status: 409 });
    if (code === 'NOT_EMPTY') return NextResponse.json({ error: 'A cylinder must be empty before it can be retired' }, { status: 409 });
    if (code === 'DESTINATION') return NextResponse.json({ error: 'Destination must be active, have the same refrigerant and unit, and have enough capacity' }, { status: 409 });
    if (code === 'IDEMPOTENCY_CONFLICT') return NextResponse.json({ error: 'This request identifier was already used for a different lifecycle movement' }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const replay = clientRequestId ? await prisma.gasUsageRecord.findUnique({ where: { clientRequestId } }) : null;
      const expectedType = action === 'lost' ? 'lost' : action === 'disposed' ? 'disposed' : 'transfer_out';
      if (replay && replay.stockId === id && replay.movementType === expectedType && replay.quantityUsed === quantity && replay.purpose === reason) {
        return NextResponse.json({ movement: replay, replayed: true }, { headers: { 'Idempotent-Replayed': 'true' } });
      }
      if (replay) return NextResponse.json({ error: 'This request identifier was already used for a different lifecycle movement' }, { status: 409 });
    }
    console.error('Cylinder lifecycle movement failed:', error);
    return NextResponse.json({ error: 'Failed to record cylinder lifecycle movement' }, { status: 500 });
  }
}
