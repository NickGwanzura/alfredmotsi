import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type GasUsageRecord } from '@prisma/client';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime } from '@/app/lib/gasUnits';
import { isTransferMovement, isValidTransferPair, oppositeTransferMovement } from '@/app/lib/gasLifecycle';

type ReversalError = Error & { code?: 'NOT_FOUND' | 'ALREADY_REVERSED' | 'STOCK_CONFLICT' | 'INVALID_LEGACY' | 'UNPAIRED_TRANSFER' | 'RETIRED_STOCK' };

function reversalError(code: ReversalError['code']): ReversalError {
  return Object.assign(new Error(code), { code });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, ['owner', 'admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = cleanText(body.reason, 500);
  if (!reason) return NextResponse.json({ error: 'A reversal reason is required' }, { status: 400 });

  const actorName = session.user.name || 'Unknown';
  const { date, time } = formatHarareDateTime();
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;

  try {
    const execute = () => prisma.$transaction(async (tx) => {
      const original = await tx.gasUsageRecord.findUnique({ where: { id } });
      if (!original) throw reversalError('NOT_FOUND');
      if (original.movementType === 'reversal' || original.reversedAt) throw reversalError('ALREADY_REVERSED');
      if (original.quantityUsed <= 0 || original.quantityKg <= 0 || original.stockDelta === 0) throw reversalError('INVALID_LEGACY');

      const originals: GasUsageRecord[] = [original];
      if (isTransferMovement(original.movementType)) {
        const opposite = oppositeTransferMovement(original.movementType);
        if (!original.transferGroupId || !opposite) throw reversalError('UNPAIRED_TRANSFER');
        const pair = await tx.gasUsageRecord.findFirst({
          where: { transferGroupId: original.transferGroupId, movementType: opposite },
        });
        if (!pair || !isValidTransferPair(original, pair)) {
          throw reversalError('UNPAIRED_TRANSFER');
        }
        originals.push(pair);
      }

      if (originals.some(record => !record.stockId)) throw reversalError('STOCK_CONFLICT');
      const stocks = await tx.gasStockItem.findMany({ where: { id: { in: originals.map(record => record.stockId!) } } });
      if (stocks.length !== originals.length) throw reversalError('STOCK_CONFLICT');
      if (stocks.some(stock => stock.retiredAt)) throw reversalError('RETIRED_STOCK');

      const results: { original: GasUsageRecord; reversal: GasUsageRecord }[] = [];
      const ordered = [...originals].sort((a, b) => a.stockId!.localeCompare(b.stockId!));
      for (const record of ordered) {
        const reverseDelta = -record.stockDelta;
        const affected = reverseDelta < 0
          ? await tx.$executeRaw`
              UPDATE "gas_stock"
              SET "remaining" = "remaining" + ${reverseDelta}, "version" = "version" + 1, "updated_at" = NOW()
              WHERE "id" = ${record.stockId!} AND "remaining" >= ${Math.abs(reverseDelta)} AND "retired_at" IS NULL
            `
          : await tx.$executeRaw`
              UPDATE "gas_stock"
              SET "remaining" = "remaining" + ${reverseDelta}, "version" = "version" + 1, "updated_at" = NOW()
              WHERE "id" = ${record.stockId!} AND "remaining" + ${reverseDelta} <= "quantity" AND "retired_at" IS NULL
            `;
        if (affected === 0) throw reversalError('STOCK_CONFLICT');

        const stock = await tx.gasStockItem.findUniqueOrThrow({ where: { id: record.stockId! } });
        const reversal = await tx.gasUsageRecord.create({
          data: {
            stockId: record.stockId,
            gasType: record.gasType,
            quantityUsed: record.quantityUsed,
            quantityKg: record.quantityKg,
            unit: record.unit,
            stockDelta: reverseDelta,
            stockBalanceAfter: stock.remaining,
            movementType: 'reversal',
            usedBy: session.user.id!,
            usedByName: actorName,
            jobId: record.jobId,
            customer: record.customer,
            date,
            time,
            purpose: `Reversal: ${reason}`,
            reversalOfId: record.id,
            stockSerialNumber: record.stockSerialNumber,
            transferGroupId: record.transferGroupId,
          },
        });
        const reversed = await tx.gasUsageRecord.update({
          where: { id: record.id },
          data: { reversedAt: new Date(), reversedBy: session.user.id!, reversedByName: actorName, reversalReason: reason },
        });

        if (record.jobId && ['used', 'reused', 'recovered'].includes(record.movementType)) {
          const field = record.movementType === 'used'
            ? Prisma.sql`"refrigerant_used"`
            : record.movementType === 'reused'
              ? Prisma.sql`"refrigerant_reused"`
              : Prisma.sql`"refrigerant_recovered"`;
          await tx.$executeRaw`
            UPDATE "diagnostics"
            SET ${field} = GREATEST(COALESCE(${field}, 0) - ${record.quantityKg}, 0)
            WHERE "job_id" = ${record.jobId}
          `;
        }
        results.push({ original: reversed, reversal });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id!, userName: actorName, action: 'reverse_gas_movement',
          jobId: original.jobId,
          reason: `${originals.length === 2 ? 'Reversed paired transfer' : 'Reversed movement'} ${original.id}: ${reason}`,
          ipAddress, userAgent,
        },
      });
      const primary = results.find(result => result.original.id === original.id)!;
      return { ...primary, paired: results.length === 2 ? results.find(result => result.original.id !== original.id) : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    let result: Awaited<ReturnType<typeof execute>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { result = await execute(); break; }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (!result) throw new Error('Reversal transaction did not complete');
    return NextResponse.json(result);
  } catch (error) {
    const code = (error as ReversalError).code;
    if (code === 'NOT_FOUND') return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    if (code === 'ALREADY_REVERSED') return NextResponse.json({ error: 'Movement has already been reversed' }, { status: 409 });
    if (code === 'STOCK_CONFLICT') return NextResponse.json({ error: 'Current stock balances cannot accept this reversal. Correct the affected stock first.' }, { status: 409 });
    if (code === 'RETIRED_STOCK') return NextResponse.json({ error: 'Retired cylinders are immutable. Record an audited replacement or correction on an active cylinder instead.' }, { status: 409 });
    if (code === 'UNPAIRED_TRANSFER') return NextResponse.json({ error: 'This transfer is missing a valid paired ledger entry and cannot be reversed automatically.' }, { status: 409 });
    if (code === 'INVALID_LEGACY') return NextResponse.json({ error: 'This legacy zero-value record cannot be reversed. It is retained for audit history only.' }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Movement has already been reversed' }, { status: 409 });
    console.error('Error reversing gas movement:', error);
    return NextResponse.json({ error: 'Failed to reverse refrigerant movement' }, { status: 500 });
  }
}
