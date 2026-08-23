import { NextRequest, NextResponse } from 'next/server';
import { Prisma, RefrigerantMovementType } from '@prisma/client';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { lifecycleRequestMatches, type CylinderLifecycleAction, type LifecycleRequestIdentity } from '@/app/lib/gasLifecycle';
import { isCertificationExpired, isLowGasStock } from '@/app/lib/gasStockRules';
import { sendPushToUsers } from '@/app/lib/push/server';

const ACTIONS = new Set<CylinderLifecycleAction>(['lost', 'disposed', 'transfer', 'retire']);

function identityFor(
  action: CylinderLifecycleAction,
  sourceStockId: string,
  destinationStockId: string | null,
  quantity: number | null,
  reason: string,
): LifecycleRequestIdentity {
  return { action, sourceStockId, destinationStockId, quantity, reason };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, ['owner', 'admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const actionText = cleanText(body.action, 30);
  const action = ACTIONS.has(actionText as CylinderLifecycleAction) ? actionText as CylinderLifecycleAction : null;
  const reason = cleanText(body.reason, 500);
  const destinationStockId = cleanText(body.destinationStockId, 100) || null;
  const clientRequestId = cleanText(body.clientRequestId, 100);
  const parsedQuantity = Number(body.quantity);
  const quantity = action === 'retire' ? null : parsedQuantity;
  const expectedVersion = Number(body.expectedVersion);
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;
  if (!action || !reason || !clientRequestId || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return NextResponse.json({ error: 'Action, request identifier, current stock version, and reason are required' }, { status: 400 });
  }
  if (action !== 'retire' && (!Number.isFinite(quantity) || (quantity ?? 0) <= 0)) {
    return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
  }
  if (action === 'transfer' && (!destinationStockId || destinationStockId === id)) {
    return NextResponse.json({ error: 'Select a different destination cylinder' }, { status: 400 });
  }

  const submittedIdentity = identityFor(action, id, action === 'transfer' ? destinationStockId : null, quantity, reason);
  const today = formatHarareDateTime().date;

  try {
    const execute = () => prisma.$transaction(async (tx) => {
      const prior = await tx.gasLifecycleRequest.findUnique({ where: { clientRequestId } });
      if (prior) {
        if (!lifecycleRequestMatches(prior, submittedIdentity)) {
          throw Object.assign(new Error('request conflict'), { code: 'IDEMPOTENCY_CONFLICT' });
        }
        const [movement, stock] = await Promise.all([
          prior.movementId ? tx.gasUsageRecord.findUnique({ where: { id: prior.movementId } }) : null,
          tx.gasStockItem.findUnique({ where: { id } }),
        ]);
        return { movement, stock, replayed: true, lowStock: false };
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
        await tx.gasLifecycleRequest.create({ data: { clientRequestId, ...submittedIdentity } });
        return { movement: null, stock, replayed: false, lowStock: false };
      }

      const materialQuantity = quantity!;
      const sourceUpdated = await tx.gasStockItem.updateMany({
        where: { id, version: expectedVersion, remaining: { gte: materialQuantity }, retiredAt: null },
        data: { remaining: { decrement: materialQuantity }, version: { increment: 1 } },
      });
      if (sourceUpdated.count !== 1) throw Object.assign(new Error('stock conflict'), { code: 'STOCK_CONFLICT' });
      const afterSource = await tx.gasStockItem.findUniqueOrThrow({ where: { id } });
      const { date, time } = formatHarareDateTime();
      const actorName = session.user.name || 'Unknown';
      const movementType: RefrigerantMovementType = action === 'lost' ? 'lost' : action === 'disposed' ? 'disposed' : 'transfer_out';
      const transferGroupId = action === 'transfer' ? clientRequestId : null;
      const movement = await tx.gasUsageRecord.create({ data: {
        stockId: id, gasType: source.gasType, quantityUsed: materialQuantity, quantityKg: gasQuantityToKg(materialQuantity, unit), unit,
        stockDelta: -materialQuantity, stockBalanceAfter: afterSource.remaining, movementType,
        usedBy: session.user.id!, usedByName: actorName, customer: 'Cylinder lifecycle', date, time, purpose: reason,
        clientRequestId,
        stockSerialNumber: source.serialNumber,
        transferGroupId,
      } });

      if (action === 'transfer') {
        if (!source.serialNumber) throw Object.assign(new Error('source identity'), { code: 'SOURCE_IDENTITY' });
        const destination = await tx.gasStockItem.findUnique({ where: { id: destinationStockId! } });
        if (!destination || destination.retiredAt || !destination.serialNumber
          || destination.gasType !== source.gasType || destination.unit !== source.unit || destination.stockKind !== source.stockKind
          || isCertificationExpired(destination.certificationExpiresAt, today)) {
          throw Object.assign(new Error('destination'), { code: 'DESTINATION' });
        }
        const destinationUpdated = await tx.gasStockItem.updateMany({
          where: { id: destination.id, version: destination.version, remaining: { lte: destination.quantity - materialQuantity }, retiredAt: null },
          data: { remaining: { increment: materialQuantity }, version: { increment: 1 } },
        });
        if (destinationUpdated.count !== 1) throw Object.assign(new Error('destination capacity'), { code: 'DESTINATION' });
        const afterDestination = await tx.gasStockItem.findUniqueOrThrow({ where: { id: destination.id } });
        await tx.gasUsageRecord.create({ data: {
          stockId: destination.id, gasType: destination.gasType, quantityUsed: materialQuantity, quantityKg: gasQuantityToKg(materialQuantity, unit), unit,
          stockDelta: materialQuantity, stockBalanceAfter: afterDestination.remaining, movementType: 'transfer_in',
          usedBy: session.user.id!, usedByName: actorName, customer: 'Cylinder lifecycle', date, time,
          purpose: `Transfer from ${source.serialNumber}: ${reason}`,
          clientRequestId: `${clientRequestId}:in`,
          stockSerialNumber: destination.serialNumber,
          transferGroupId,
        } });
      }

      const crossedLowStock = !isLowGasStock(source) && isLowGasStock(afterSource);
      if (crossedLowStock) {
        await tx.notificationEvent.create({ data: {
          event: 'gas.low_stock', channel: 'internal', referenceId: id, provider: 'internal-dashboard', status: 'sent', sentAt: new Date(),
          payload: { stockId: id, gasType: source.gasType, serialNumber: source.serialNumber, remaining: afterSource.remaining, unit, capacity: source.quantity },
        } });
      }

      await tx.auditLog.create({ data: {
        userId: session.user.id!, userName: actorName, action: 'create_gas_movement',
        reason: `${action}: ${materialQuantity} ${unit} from ${source.serialNumber || id}${destinationStockId ? ` to ${destinationStockId}` : ''}; ${reason}`,
        ipAddress, userAgent,
      } });
      await tx.gasLifecycleRequest.create({ data: { clientRequestId, ...submittedIdentity, movementId: movement.id } });
      return { movement, stock: afterSource, replayed: false, lowStock: crossedLowStock };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    let result: Awaited<ReturnType<typeof execute>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { result = await execute(); break; }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (!result) throw new Error('Lifecycle transaction did not complete');

    if (result.lowStock && !result.replayed) {
      const recipients = await prisma.user.findMany({ where: { role: { in: ['owner', 'admin', 'dispatcher'] } }, select: { id: true } });
      await sendPushToUsers(recipients.map(user => user.id), {
        title: 'Low refrigerant stock',
        body: `${result.stock?.gasType || 'Refrigerant'} cylinder ${result.stock?.serialNumber || id} is at or below 20%.`,
        url: '/',
      });
    }
    return NextResponse.json(result, { status: result.replayed ? 200 : 201, headers: result.replayed ? { 'Idempotent-Replayed': 'true' } : undefined });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'NOT_FOUND') return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 });
    if (code === 'VERSION' || code === 'STOCK_CONFLICT') return NextResponse.json({ error: 'Cylinder changed while you were editing it. Refresh and retry.' }, { status: 409 });
    if (code === 'RETIRED') return NextResponse.json({ error: 'Cylinder is already retired' }, { status: 409 });
    if (code === 'NOT_EMPTY') return NextResponse.json({ error: 'A cylinder must be empty before it can be retired' }, { status: 409 });
    if (code === 'SOURCE_IDENTITY') return NextResponse.json({ error: 'Verify the source cylinder serial number before transferring refrigerant' }, { status: 409 });
    if (code === 'DESTINATION') return NextResponse.json({ error: 'Destination must be active, identified, certified, have the same refrigerant, unit, and cylinder type, and have enough capacity' }, { status: 409 });
    if (code === 'IDEMPOTENCY_CONFLICT') return NextResponse.json({ error: 'This request identifier was already used for a different lifecycle movement' }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const replay = await prisma.gasLifecycleRequest.findUnique({ where: { clientRequestId } });
      if (replay && lifecycleRequestMatches(replay, submittedIdentity)) {
        const [movement, stock] = await Promise.all([
          replay.movementId ? prisma.gasUsageRecord.findUnique({ where: { id: replay.movementId } }) : null,
          prisma.gasStockItem.findUnique({ where: { id } }),
        ]);
        return NextResponse.json({ movement, stock, replayed: true }, { headers: { 'Idempotent-Replayed': 'true' } });
      }
      return NextResponse.json({ error: 'This request identifier is already in use' }, { status: 409 });
    }
    console.error('Cylinder lifecycle movement failed:', error);
    return NextResponse.json({ error: 'Failed to record cylinder lifecycle movement' }, { status: 500 });
  }
}
