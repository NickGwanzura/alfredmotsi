import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText } from '@/app/lib/serviceAuth';
import { formatHarareDateTime } from '@/app/lib/gasUnits';

type ReversalError = Error & { code?: 'NOT_FOUND' | 'ALREADY_REVERSED' | 'STOCK_CONFLICT' | 'INVALID_LEGACY' };

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
      if (!original) {
        const error = new Error('Movement not found') as ReversalError;
        error.code = 'NOT_FOUND';
        throw error;
      }
      if (original.movementType === 'reversal' || original.reversedAt) {
        const error = new Error('Movement already reversed') as ReversalError;
        error.code = 'ALREADY_REVERSED';
        throw error;
      }
      if (original.quantityUsed <= 0 || original.quantityKg <= 0 || original.stockDelta === 0) {
        const error = new Error('Legacy zero-value movements cannot be reversed') as ReversalError;
        error.code = 'INVALID_LEGACY';
        throw error;
      }
      if (!original.stockId) {
        const error = new Error('Movement stock no longer exists') as ReversalError;
        error.code = 'STOCK_CONFLICT';
        throw error;
      }

      const reverseDelta = -original.stockDelta;
      const affected = reverseDelta < 0
        ? await tx.$executeRaw`
            UPDATE "gas_stock"
            SET "remaining" = "remaining" + ${reverseDelta}, "version" = "version" + 1, "updated_at" = NOW()
            WHERE "id" = ${original.stockId} AND "remaining" >= ${Math.abs(reverseDelta)}
          `
        : await tx.$executeRaw`
            UPDATE "gas_stock"
            SET "remaining" = "remaining" + ${reverseDelta}, "version" = "version" + 1, "updated_at" = NOW()
            WHERE "id" = ${original.stockId} AND "remaining" + ${reverseDelta} <= "quantity"
          `;
      if (affected === 0) {
        const error = new Error('Current stock balance cannot accept this reversal') as ReversalError;
        error.code = 'STOCK_CONFLICT';
        throw error;
      }

      const stock = await tx.gasStockItem.findUniqueOrThrow({ where: { id: original.stockId } });
      const reversal = await tx.gasUsageRecord.create({
        data: {
          stockId: original.stockId,
          gasType: original.gasType,
          quantityUsed: original.quantityUsed,
          quantityKg: original.quantityKg,
          unit: original.unit,
          stockDelta: reverseDelta,
          stockBalanceAfter: stock.remaining,
          movementType: 'reversal',
          usedBy: session.user.id!,
          usedByName: actorName,
          jobId: original.jobId,
          customer: original.customer,
          date,
          time,
          purpose: `Reversal: ${reason}`,
          reversalOfId: original.id,
          stockSerialNumber: original.stockSerialNumber,
        },
      });
      const reversed = await tx.gasUsageRecord.update({
        where: { id: original.id },
        data: { reversedAt: new Date(), reversedBy: session.user.id!, reversedByName: actorName, reversalReason: reason },
      });

      if (original.jobId && ['used', 'reused', 'recovered'].includes(original.movementType)) {
        const field = original.movementType === 'used'
          ? Prisma.sql`"refrigerant_used"`
          : original.movementType === 'reused'
            ? Prisma.sql`"refrigerant_reused"`
            : Prisma.sql`"refrigerant_recovered"`;
        await tx.$executeRaw`
          UPDATE "diagnostics"
          SET ${field} = GREATEST(COALESCE(${field}, 0) - ${original.quantityKg}, 0)
          WHERE "job_id" = ${original.jobId}
        `;
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id!, userName: actorName, action: 'reverse_gas_movement',
          jobId: original.jobId, reason: `Reversed ${original.id}: ${reason}`,
          ipAddress, userAgent,
        },
      });
      return { original: reversed, reversal };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    let result: Awaited<ReturnType<typeof execute>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await execute();
        break;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    if (!result) throw new Error('Reversal transaction did not complete');

    return NextResponse.json(result);
  } catch (error) {
    const reversalError = error as ReversalError;
    if (reversalError.code === 'NOT_FOUND') return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    if (reversalError.code === 'ALREADY_REVERSED') return NextResponse.json({ error: 'Movement has already been reversed' }, { status: 409 });
    if (reversalError.code === 'STOCK_CONFLICT') {
      return NextResponse.json({ error: 'Current stock balance cannot accept this reversal. Correct the stock first.' }, { status: 409 });
    }
    if (reversalError.code === 'INVALID_LEGACY') {
      return NextResponse.json({ error: 'This legacy zero-value record cannot be reversed. It is retained for audit history only.' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Movement has already been reversed' }, { status: 409 });
    }
    console.error('Error reversing gas movement:', error);
    return NextResponse.json({ error: 'Failed to reverse refrigerant movement' }, { status: 500 });
  }
}
