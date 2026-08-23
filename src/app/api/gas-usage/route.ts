import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { Prisma, RefrigerantMovementType } from '@prisma/client';
import { canAccessJob, cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime, gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { gasMovementStockDelta, validateGasMovementStock, type ServiceGasMovement } from '@/app/lib/gasMovement';
import { toPrismaRefrigerantType, toRefrigerantLabel } from '@/app/lib/refrigerantType';

type MovementError = Error & {
  code?: 'STOCK_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'CYLINDER_FULL';
  remaining?: number;
  unit?: string;
};

const JOB_MOVEMENTS = new Set<RefrigerantMovementType>(['used', 'recovered', 'reused']);

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'accounts', 'tech']);
    if (forbidden) return forbidden;

    const role = session.user.role as string;
    const userId = session.user.id!;
    const movements = await prisma.gasUsageRecord.findMany({
      where: role === 'tech'
        ? { job: { OR: [{ technicians: { some: { id: userId } } }, { coTechnicians: { some: { id: userId } } }] } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(movements);
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
      prisma.job.findUnique({ where: { id: jobId }, select: { customer: { select: { name: true } } } }),
      prisma.gasStockItem.findUnique({ where: { id: stockId } }),
    ]);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!stock) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });

    const gasType = toRefrigerantLabel(stock.gasType);
    const diagnosticGasType = toPrismaRefrigerantType(stock.gasType);
    const unit = normalizeGasUnit(stock.unit);
    if (!gasType || !diagnosticGasType) {
      return NextResponse.json({ error: 'This stock item needs a valid refrigerant type before it can be used' }, { status: 400 });
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
    try {
      movement = await prisma.$transaction(async (tx) => {
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
          },
        });

        const existing = await tx.diagnostics.findUnique({ where: { jobId } });
        const increment = (value: number | null | undefined) => (value ?? 0) + quantityKg;
        const update: Prisma.DiagnosticsUncheckedUpdateInput = {};
        if (!existing?.refrigerantType) update.refrigerantType = diagnosticGasType;
        if (movementType === 'used') update.refrigerantUsed = increment(existing?.refrigerantUsed);
        if (movementType === 'reused') update.refrigerantReused = increment(existing?.refrigerantReused);
        if (movementType === 'recovered') update.refrigerantRecovered = increment(existing?.refrigerantRecovered);
        await tx.diagnostics.upsert({
          where: { jobId }, update,
          create: {
            jobId, refrigerantType: diagnosticGasType,
            refrigerantUsed: movementType === 'used' ? quantityKg : 0,
            refrigerantReused: movementType === 'reused' ? quantityKg : 0,
            refrigerantRecovered: movementType === 'recovered' ? quantityKg : 0,
          },
        });

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
      throw error;
    }

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error('Error recording refrigerant movement:', error);
    return NextResponse.json({ error: 'Failed to record refrigerant movement' }, { status: 500 });
  }
}
