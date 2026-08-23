import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { Prisma, RefrigerantMovementType } from '@prisma/client';
import { canAccessJob, cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { gasMovementStockDelta, validateGasMovementStock, type ServiceGasMovement } from '@/app/lib/gasMovement';
import { toPrismaRefrigerantType, toRefrigerantLabel } from '@/app/lib/refrigerantType';
import { canRecordGasForJobStatus } from '@/app/lib/gasLedger';
import type { JobStatus } from '@/app/types';

type MovementError = Error & {
  code?: 'STOCK_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'CYLINDER_FULL' | 'IDEMPOTENCY_CONFLICT';
  remaining?: number;
  unit?: string;
};

const JOB_MOVEMENTS = new Set<RefrigerantMovementType>(['used', 'recovered', 'reused']);

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
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'tech']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const stockId = cleanText(body.stockId, 100);
    const jobId = cleanText(body.jobId, 100);
    const purpose = cleanText(body.purpose, 500);
    const movementType = cleanText(body.movementType, 30) as RefrigerantMovementType;
    const quantity = Number(body.quantityUsed);
    const clientRequestId = cleanText(body.clientRequestId, 100) || null;

    if (!stockId || !jobId || !JOB_MOVEMENTS.has(movementType)) {
      return NextResponse.json({ error: 'Stock, job, and an explicit movement type are required' }, { status: 400 });
    }
    if (!purpose) return NextResponse.json({ error: 'A purpose or service reason is required' }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }
    if (!await canAccessJob(session.user.id!, session.user.role as string, jobId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [job, stock] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId }, select: { status: true, diagnostics: { select: { refrigerantType: true } }, customer: { select: { name: true } } } }),
      prisma.gasStockItem.findUnique({ where: { id: stockId } }),
    ]);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!stock) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
    if (!canRecordGasForJobStatus(job.status.replaceAll('_', '-') as JobStatus)) {
      return NextResponse.json({ error: `Refrigerant cannot be recorded while the job is ${job.status.replaceAll('_', ' ')}` }, { status: 409 });
    }
    if (stock.retiredAt) return NextResponse.json({ error: 'This cylinder has been retired and cannot be used' }, { status: 409 });
    if (!stock.serialNumber) return NextResponse.json({ error: 'This cylinder needs a unique serial number before it can be used' }, { status: 409 });
    if (stock.certificationExpiresAt && stock.certificationExpiresAt < new Date()) {
      return NextResponse.json({ error: 'This cylinder certification has expired. Use the lifecycle controls to transfer or retire it.' }, { status: 409 });
    }

    const gasType = toRefrigerantLabel(stock.gasType);
    const diagnosticGasType = toPrismaRefrigerantType(stock.gasType);
    const unit = normalizeGasUnit(stock.unit);
    if (!gasType || !diagnosticGasType) {
      return NextResponse.json({ error: 'This stock item needs a valid refrigerant type before it can be used' }, { status: 400 });
    }
    const existingDiagnosticType = toRefrigerantLabel(job.diagnostics?.refrigerantType);
    if (existingDiagnosticType && existingDiagnosticType !== gasType) {
      return NextResponse.json({ error: `Job diagnostics specify ${existingDiagnosticType}, but the selected cylinder contains ${gasType}. Correct the job refrigerant type before recording this movement.` }, { status: 409 });
    }
    if (!unit) return NextResponse.json({ error: 'This stock item has an unsupported unit' }, { status: 400 });
    const movementValidationError = validateGasMovementStock(movementType as ServiceGasMovement, stock, quantity);
    if (movementValidationError) return NextResponse.json({ error: movementValidationError }, { status: 400 });

    const quantityKg = gasQuantityToKg(quantity, unit);
    const stockDelta = gasMovementStockDelta(movementType as ServiceGasMovement, quantity);
    const { date, time } = formatHarareDateTime();
    const actorName = session.user.name || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    let movement;
    let replayed = false;
    try {
      movement = await prisma.$transaction(async (tx) => {
        if (clientRequestId) {
          const existingRequest = await tx.gasUsageRecord.findUnique({ where: { clientRequestId } });
          if (existingRequest) {
            if (existingRequest.stockId !== stockId || existingRequest.jobId !== jobId
              || existingRequest.movementType !== movementType || existingRequest.quantityUsed !== quantity
              || existingRequest.purpose !== purpose) {
              const requestError = new Error('Request key was already used for a different movement') as MovementError;
              requestError.code = 'IDEMPOTENCY_CONFLICT';
              throw requestError;
            }
            replayed = true;
            return existingRequest;
          }
        }
        const affected = stockDelta < 0
          ? await tx.$executeRaw`
              UPDATE "gas_stock"
              SET "remaining" = "remaining" + ${stockDelta}, "version" = "version" + 1, "updated_at" = NOW()
              WHERE "id" = ${stockId} AND "remaining" >= ${quantity}
            `
          : await tx.$executeRaw`
              UPDATE "gas_stock"
              SET "remaining" = "remaining" + ${stockDelta}, "version" = "version" + 1, "updated_at" = NOW()
              WHERE "id" = ${stockId} AND "remaining" + ${quantity} <= "quantity"
            `;

        if (affected === 0) {
          const current = await tx.gasStockItem.findUnique({ where: { id: stockId } });
          const movementError = new Error(stockDelta < 0 ? 'Insufficient stock' : 'Recovery cylinder capacity exceeded') as MovementError;
          movementError.code = current ? (stockDelta < 0 ? 'INSUFFICIENT_STOCK' : 'CYLINDER_FULL') : 'STOCK_NOT_FOUND';
          movementError.remaining = current?.remaining;
          movementError.unit = current?.unit;
          throw movementError;
        }

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

        const beforeBalance = currentStock.remaining - stockDelta;
        const threshold = currentStock.quantity * 0.2;
        if (stockDelta < 0 && beforeBalance > threshold && currentStock.remaining <= threshold) {
          await tx.notificationEvent.create({
            data: {
              event: 'gas.low_stock', channel: 'internal', referenceId: stockId,
              status: 'pending',
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
        return created;
      });
    } catch (error) {
      const movementError = error as MovementError;
      if (movementError.code === 'STOCK_NOT_FOUND') return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
      if (movementError.code === 'INSUFFICIENT_STOCK') {
        return NextResponse.json({ error: `Insufficient stock. Only ${movementError.remaining ?? 0} ${movementError.unit ?? unit} remaining` }, { status: 409 });
      }
      if (movementError.code === 'CYLINDER_FULL') {
        return NextResponse.json({ error: 'Recovered quantity exceeds the cylinder capacity' }, { status: 409 });
      }
      if (movementError.code === 'IDEMPOTENCY_CONFLICT') {
        return NextResponse.json({ error: 'This request identifier was already used for a different movement' }, { status: 409 });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && clientRequestId) {
        const existingRequest = await prisma.gasUsageRecord.findUnique({ where: { clientRequestId } });
        if (existingRequest) {
          if (existingRequest.stockId !== stockId || existingRequest.jobId !== jobId
            || existingRequest.movementType !== movementType || existingRequest.quantityUsed !== quantity
            || existingRequest.purpose !== purpose) {
            return NextResponse.json({ error: 'This request identifier was already used for a different movement' }, { status: 409 });
          }
          return NextResponse.json(existingRequest, { status: 200, headers: { 'Idempotent-Replayed': 'true' } });
        }
      }
      throw error;
    }

    return NextResponse.json(movement, { status: replayed ? 200 : 201, headers: replayed ? { 'Idempotent-Replayed': 'true' } : undefined });
  } catch (error) {
    console.error('Error recording refrigerant movement:', error);
    return NextResponse.json({ error: 'Failed to record refrigerant movement' }, { status: 500 });
  }
}
