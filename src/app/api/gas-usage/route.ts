import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { Prisma, RefrigerantMovementType } from '@prisma/client';
import { canAccessJob, cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { gasMovementStockDelta, validateGasMovementStock, type ServiceGasMovement } from '@/app/lib/gasMovement';
import { toPrismaRefrigerantType, toRefrigerantLabel } from '@/app/lib/refrigerantType';
import { canRecordGasForJobStatus } from '@/app/lib/gasLedger';
import { isCertificationExpired, isLowGasStock } from '@/app/lib/gasStockRules';
import { sendPushToUsers } from '@/app/lib/push/server';
import type { JobStatus } from '@/app/types';

type MovementError = Error & {
  code?: 'JOB_NOT_FOUND' | 'STOCK_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'CYLINDER_FULL' | 'IDEMPOTENCY_CONFLICT' | 'JOB_STATUS' | 'RETIRED' | 'SERIAL' | 'EXPIRED' | 'INVALID_GAS' | 'GAS_MISMATCH' | 'INVALID_UNIT' | 'INVALID_STOCK_KIND' | 'STOCK_CONFLICT';
  remaining?: number;
  unit?: string;
  detail?: string;
};

const JOB_MOVEMENTS = new Set<RefrigerantMovementType>(['used', 'recovered', 'reused']);

function movementError(code: MovementError['code'], detail?: string): MovementError {
  return Object.assign(new Error(detail || code), { code, detail });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'accounts', 'tech']);
    if (forbidden) return forbidden;

    const role = session.user.role as string;
    const userId = session.user.id!;
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 250, 1), 500);
    const cursor = cleanText(request.nextUrl.searchParams.get('cursor'), 100);
    const movements = await prisma.gasUsageRecord.findMany({
      where: role === 'tech'
        ? { job: { OR: [{ technicians: { some: { id: userId } } }, { coTechnicians: { some: { id: userId } } }] } }
        : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = movements.length > limit;
    const page = hasMore ? movements.slice(0, limit) : movements;
    const response = NextResponse.json(page);
    if (hasMore) response.headers.set('X-Next-Cursor', page.at(-1)!.id);
    return response;
  } catch (error) {
    console.error('Error fetching gas movements:', error);
    return NextResponse.json({ error: 'Failed to fetch refrigerant movements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let retryIdentity: { clientRequestId: string; stockId: string; jobId: string; movementType: RefrigerantMovementType; quantity: number; purpose: string } | null = null;
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'tech']);
    if (forbidden) return forbidden;

    const body = await request.json().catch(() => ({}));
    const stockId = cleanText(body.stockId, 100);
    const jobId = cleanText(body.jobId, 100);
    const purpose = cleanText(body.purpose, 500);
    const movementType = cleanText(body.movementType, 30) as RefrigerantMovementType;
    const quantity = Number(body.quantityUsed);
    const clientRequestId = cleanText(body.clientRequestId, 100);
    retryIdentity = { clientRequestId, stockId, jobId, movementType, quantity, purpose };

    if (!stockId || !jobId || !clientRequestId || !JOB_MOVEMENTS.has(movementType)) {
      return NextResponse.json({ error: 'Stock, job, request identifier, and an explicit movement type are required' }, { status: 400 });
    }
    if (!purpose) return NextResponse.json({ error: 'A purpose or service reason is required' }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }
    if (!await canAccessJob(session.user.id!, session.user.role as string, jobId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { date, time } = formatHarareDateTime();
    const today = date;
    const actorName = session.user.name || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const execute = () => prisma.$transaction(async (tx) => {
      const existingRequest = await tx.gasUsageRecord.findUnique({ where: { clientRequestId } });
      if (existingRequest) {
        if (existingRequest.stockId !== stockId || existingRequest.jobId !== jobId
          || existingRequest.movementType !== movementType || existingRequest.quantityUsed !== quantity
          || existingRequest.purpose !== purpose) {
          throw movementError('IDEMPOTENCY_CONFLICT');
        }
        return { movement: existingRequest, replayed: true, lowStock: false };
      }

      const [job, stock] = await Promise.all([
        tx.job.findUnique({ where: { id: jobId }, select: { status: true, diagnostics: { select: { refrigerantType: true } }, customer: { select: { name: true } } } }),
        tx.gasStockItem.findUnique({ where: { id: stockId } }),
      ]);
      if (!job) throw movementError('JOB_NOT_FOUND');
      if (!stock) throw movementError('STOCK_NOT_FOUND');
      if (!canRecordGasForJobStatus(job.status.replaceAll('_', '-') as JobStatus)) {
        throw movementError('JOB_STATUS', `Refrigerant cannot be recorded while the job is ${job.status.replaceAll('_', ' ')}`);
      }
      if (stock.retiredAt) throw movementError('RETIRED');
      if (!stock.serialNumber) throw movementError('SERIAL');
      if (isCertificationExpired(stock.certificationExpiresAt, today)) throw movementError('EXPIRED');

      const gasType = toRefrigerantLabel(stock.gasType);
      const diagnosticGasType = toPrismaRefrigerantType(stock.gasType);
      const unit = normalizeGasUnit(stock.unit);
      if (!gasType || !diagnosticGasType) throw movementError('INVALID_GAS');
      const existingDiagnosticType = toRefrigerantLabel(job.diagnostics?.refrigerantType);
      if (existingDiagnosticType && existingDiagnosticType !== gasType) {
        throw movementError('GAS_MISMATCH', `Job diagnostics specify ${existingDiagnosticType}, but the selected cylinder contains ${gasType}. Correct the job refrigerant type before recording this movement.`);
      }
      if (!unit) throw movementError('INVALID_UNIT');
      const movementValidationError = validateGasMovementStock(movementType as ServiceGasMovement, stock, quantity);
      if (movementValidationError) {
        const error = movementError(movementValidationError === 'Insufficient stock' ? 'INSUFFICIENT_STOCK'
          : movementValidationError === 'Recovered quantity exceeds the cylinder capacity' ? 'CYLINDER_FULL' : 'INVALID_STOCK_KIND', movementValidationError);
        error.remaining = stock.remaining;
        error.unit = stock.unit;
        throw error;
      }

      const quantityKg = gasQuantityToKg(quantity, unit);
      const stockDelta = gasMovementStockDelta(movementType as ServiceGasMovement, quantity);
      const affected = stockDelta < 0
        ? await tx.$executeRaw`
            UPDATE "gas_stock"
            SET "remaining" = "remaining" + ${stockDelta}, "version" = "version" + 1, "updated_at" = NOW()
            WHERE "id" = ${stockId} AND "remaining" >= ${quantity}
              AND "retired_at" IS NULL AND "serial_number" IS NOT NULL
              AND ("certification_expires_at" IS NULL OR "certification_expires_at"::date >= ${today}::date)
              AND "stock_kind" = ${stock.stockKind}::"GasStockKind"
          `
        : await tx.$executeRaw`
            UPDATE "gas_stock"
            SET "remaining" = "remaining" + ${stockDelta}, "version" = "version" + 1, "updated_at" = NOW()
            WHERE "id" = ${stockId} AND "remaining" + ${quantity} <= "quantity"
              AND "retired_at" IS NULL AND "serial_number" IS NOT NULL
              AND ("certification_expires_at" IS NULL OR "certification_expires_at"::date >= ${today}::date)
              AND "stock_kind" = ${stock.stockKind}::"GasStockKind"
          `;

      if (affected === 0) throw movementError('STOCK_CONFLICT');

      const currentStock = await tx.gasStockItem.findUniqueOrThrow({ where: { id: stockId } });
      const created = await tx.gasUsageRecord.create({
        data: {
          stockId, gasType, quantityUsed: quantity, quantityKg, unit, stockDelta,
          stockBalanceAfter: currentStock.remaining, movementType,
          usedBy: session.user.id!, usedByName: actorName, jobId,
          customer: job.customer.name, date, time, purpose,
          clientRequestId,
          stockSerialNumber: currentStock.serialNumber,
        },
      });

      if (movementType === 'used') {
        await tx.$executeRaw`INSERT INTO "diagnostics" ("id", "job_id", "refrigerant_type", "refrigerant_used")
          VALUES (${crypto.randomUUID()}, ${jobId}, ${gasType}::"RefrigerantType", ${quantityKg})
          ON CONFLICT ("job_id") DO UPDATE SET
            "refrigerant_type" = COALESCE("diagnostics"."refrigerant_type", EXCLUDED."refrigerant_type"),
            "refrigerant_used" = COALESCE("diagnostics"."refrigerant_used", 0) + EXCLUDED."refrigerant_used"`;
      } else if (movementType === 'reused') {
        await tx.$executeRaw`INSERT INTO "diagnostics" ("id", "job_id", "refrigerant_type", "refrigerant_reused")
          VALUES (${crypto.randomUUID()}, ${jobId}, ${gasType}::"RefrigerantType", ${quantityKg})
          ON CONFLICT ("job_id") DO UPDATE SET
            "refrigerant_type" = COALESCE("diagnostics"."refrigerant_type", EXCLUDED."refrigerant_type"),
            "refrigerant_reused" = COALESCE("diagnostics"."refrigerant_reused", 0) + EXCLUDED."refrigerant_reused"`;
      } else {
        await tx.$executeRaw`INSERT INTO "diagnostics" ("id", "job_id", "refrigerant_type", "refrigerant_recovered")
          VALUES (${crypto.randomUUID()}, ${jobId}, ${gasType}::"RefrigerantType", ${quantityKg})
          ON CONFLICT ("job_id") DO UPDATE SET
            "refrigerant_type" = COALESCE("diagnostics"."refrigerant_type", EXCLUDED."refrigerant_type"),
            "refrigerant_recovered" = COALESCE("diagnostics"."refrigerant_recovered", 0) + EXCLUDED."refrigerant_recovered"`;
      }

      const crossedLowStock = !isLowGasStock(stock) && isLowGasStock(currentStock);
      if (crossedLowStock) {
        await tx.notificationEvent.create({
          data: {
            event: 'gas.low_stock', channel: 'internal', referenceId: stockId,
            provider: 'internal-dashboard', status: 'sent', sentAt: new Date(),
            payload: { stockId, gasType, serialNumber: currentStock.serialNumber, remaining: currentStock.remaining, unit, capacity: currentStock.quantity },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id!, userName: actorName, action: 'create_gas_movement', jobId,
          reason: `${movementType}: ${quantity} ${unit} (${quantityKg.toFixed(3)} kg) ${gasType}; stock ${currentStock.remaining} ${unit}; ${purpose}`,
          ipAddress, userAgent,
        },
      });
      return { movement: created, replayed: false, lowStock: crossedLowStock };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    let result: Awaited<ReturnType<typeof execute>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { result = await execute(); break; }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (!result) throw new Error('Gas movement transaction did not complete');

    if (result.lowStock && !result.replayed) {
      const recipients = await prisma.user.findMany({ where: { role: { in: ['owner', 'admin', 'dispatcher'] } }, select: { id: true } });
      await sendPushToUsers(recipients.map(user => user.id), {
        title: 'Low refrigerant stock',
        body: `${result.movement.gasType} cylinder ${result.movement.stockSerialNumber || stockId} is at or below 20%.`,
        url: '/',
      });
    }

    return NextResponse.json(result.movement, { status: result.replayed ? 200 : 201, headers: result.replayed ? { 'Idempotent-Replayed': 'true' } : undefined });
  } catch (error) {
    const movement = error as MovementError;
    if (movement.code === 'JOB_NOT_FOUND') return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (movement.code === 'STOCK_NOT_FOUND') return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
    if (movement.code === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: `Insufficient stock. Only ${movement.remaining ?? 0} ${movement.unit ?? ''} remaining` }, { status: 409 });
    if (movement.code === 'CYLINDER_FULL') return NextResponse.json({ error: 'Recovered quantity exceeds the cylinder capacity' }, { status: 409 });
    if (movement.code === 'JOB_STATUS' || movement.code === 'GAS_MISMATCH' || movement.code === 'INVALID_STOCK_KIND') return NextResponse.json({ error: movement.detail }, { status: 409 });
    if (movement.code === 'RETIRED') return NextResponse.json({ error: 'This cylinder has been retired and cannot be used' }, { status: 409 });
    if (movement.code === 'SERIAL') return NextResponse.json({ error: 'This cylinder needs a verified unique serial number before it can be used' }, { status: 409 });
    if (movement.code === 'EXPIRED') return NextResponse.json({ error: 'This cylinder certification has expired. Transfer its contents to a certified matching cylinder or retire it.' }, { status: 409 });
    if (movement.code === 'INVALID_GAS') return NextResponse.json({ error: 'This stock item needs a valid refrigerant type before it can be used' }, { status: 400 });
    if (movement.code === 'INVALID_UNIT') return NextResponse.json({ error: 'This stock item has an unsupported unit' }, { status: 400 });
    if (movement.code === 'STOCK_CONFLICT') return NextResponse.json({ error: 'Cylinder changed or became unavailable while saving. Refresh and retry.' }, { status: 409 });
    if (movement.code === 'IDEMPOTENCY_CONFLICT') return NextResponse.json({ error: 'This request identifier was already used for a different movement' }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && retryIdentity?.clientRequestId) {
      const existing = await prisma.gasUsageRecord.findUnique({ where: { clientRequestId: retryIdentity.clientRequestId } }).catch(() => null);
      if (existing && existing.stockId === retryIdentity.stockId && existing.jobId === retryIdentity.jobId
        && existing.movementType === retryIdentity.movementType && existing.quantityUsed === retryIdentity.quantity
        && existing.purpose === retryIdentity.purpose) {
        return NextResponse.json(existing, { status: 200, headers: { 'Idempotent-Replayed': 'true' } });
      }
      return NextResponse.json({ error: 'This request identifier is already in use' }, { status: 409 });
    }
    console.error('Error recording refrigerant movement:', error);
    return NextResponse.json({ error: 'Failed to record refrigerant movement' }, { status: 500 });
  }
}
