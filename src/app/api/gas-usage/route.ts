import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { Prisma, RefrigerantType } from '@prisma/client';
import { canAccessJob, cleanText } from '@/app/lib/serviceAuth';

type StockUsageError = Error & { code?: 'STOCK_NOT_FOUND' | 'INSUFFICIENT_STOCK'; remaining?: number; unit?: string };

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and technicians may view gas usage.
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'accounts', 'tech']);
    if (forbidden) return forbidden;

    const role = (session.user as { role: string }).role;
    const userId = session.user.id!;
    const usage = await prisma.gasUsageRecord.findMany({
      where: role === 'tech' ? { job: { OR: [{ technicians: { some: { id: userId } } }, { coTechnicians: { some: { id: userId } } }] } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching gas usage:', error);
    return NextResponse.json({ error: 'Failed to fetch gas usage' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'tech']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { stockId, gasType, quantityUsed, jobId, purpose } = body;

    if (!stockId || !gasType || !jobId) {
      return NextResponse.json(
        { error: 'Stock ID, gas type, quantity used, and job ID are required' },
        { status: 400 }
      );
    }

    const qty = typeof quantityUsed === 'number' ? quantityUsed : parseFloat(quantityUsed);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }
    if (!await canAccessJob(session.user.id!, session.user.role as string, jobId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [job, stock] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId }, select: { customer: { select: { name: true } } } }),
      prisma.gasStockItem.findUnique({ where: { id: stockId }, select: { gasType: true } }),
    ]);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!stock) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
    const canonicalCustomer = job.customer.name;
    if (!Object.values(RefrigerantType).includes(stock.gasType as RefrigerantType)) {
      return NextResponse.json({ error: 'Gas stock item has an unsupported refrigerant type' }, { status: 400 });
    }
    const canonicalGasType = stock.gasType as RefrigerantType;

    let usageRecord: unknown;
    try {
      usageRecord = await prisma.$transaction(async (tx) => {
        const affected = await tx.$executeRaw`
          UPDATE "gas_stock"
          SET "remaining" = "remaining" - ${qty}
          WHERE "id" = ${stockId} AND "remaining" >= ${qty}
        `;

        if (affected === 0) {
          const stockItem = await tx.gasStockItem.findUnique({ where: { id: stockId } });
          if (!stockItem) {
            const e = new Error('Gas stock item not found');
            (e as StockUsageError).code = 'STOCK_NOT_FOUND';
            throw e;
          }
          const e = new Error('Insufficient stock');
          (e as StockUsageError).code = 'INSUFFICIENT_STOCK';
          (e as StockUsageError).remaining = stockItem.remaining;
          (e as StockUsageError).unit = stockItem.unit;
          throw e;
        }

        const created = await tx.gasUsageRecord.create({
          data: {
            stockId,
            gasType: canonicalGasType,
            quantityUsed: qty,
            usedBy: session.user.id!,
            jobId,
            customer: canonicalCustomer,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            purpose: cleanText(purpose, 500),
          },
        });

        const purposeLower = cleanText(purpose, 500).toLowerCase();

        let diagKind: 'recovered' | 'used' | 'reused' = 'used';
        if (/(recover|recovered|recovery)/.test(purposeLower)) diagKind = 'recovered';
        else if (/(reuse|reused)/.test(purposeLower)) diagKind = 'reused';

        const existingDiag = await tx.diagnostics.findUnique({ where: { jobId } });

        const shouldSetType = !existingDiag?.refrigerantType;

        const increment = (value: number | null | undefined) => (value ?? 0) + qty;

        const update: Prisma.DiagnosticsUncheckedUpdateInput = {};
        if (shouldSetType) {
          update.refrigerantType = canonicalGasType;
        }

        if (diagKind === 'recovered') {
          update.refrigerantRecovered = increment(existingDiag?.refrigerantRecovered);
        } else if (diagKind === 'used') {
          update.refrigerantUsed = increment(existingDiag?.refrigerantUsed);
        } else {
          update.refrigerantReused = increment(existingDiag?.refrigerantReused);
        }

        const create: Prisma.DiagnosticsUncheckedCreateInput = {
          jobId,
          refrigerantType: canonicalGasType,
        };

        if (diagKind === 'recovered') {
          create.refrigerantRecovered = qty;
        } else if (diagKind === 'used') {
          create.refrigerantUsed = qty;
        } else {
          create.refrigerantReused = qty;
        }

        await tx.diagnostics.upsert({
          where: { jobId },
          update,
          create,
        });

        return created;
      });
    } catch (txError: unknown) {
      const stockError = txError as StockUsageError;
      if (stockError.code === 'STOCK_NOT_FOUND') {
        return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
      }
      if (stockError.code === 'INSUFFICIENT_STOCK') {
        const remaining = stockError.remaining ?? 0;
        const unit = stockError.unit ?? 'kg';
        return NextResponse.json({ error: `Insufficient stock. Only ${remaining} ${unit} remaining` }, { status: 400 });
      }
      throw txError;
    }

    return NextResponse.json(usageRecord, { status: 201 });
  } catch (error) {
    console.error('Error recording gas usage:', error);
    return NextResponse.json({ error: 'Failed to record gas usage' }, { status: 500 });
  }
}
