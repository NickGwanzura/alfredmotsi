import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, positiveNumber } from '@/app/lib/serviceAuth';
import { canManageGasStock } from '@/app/lib/permissions';
import { toRefrigerantLabel } from '@/app/lib/refrigerantType';
import { formatHarareDateTime, normalizeGasUnit } from '@/app/lib/gasUnits';
import type { GasStockKind } from '@prisma/client';
import { Prisma } from '@prisma/client';

const STOCK_KINDS = new Set<GasStockKind>(['virgin', 'recovered', 'waste']);

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and technicians may view gas stock.
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const stock = await prisma.gasStockItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error fetching gas stock:', error);
    return NextResponse.json({ error: 'Failed to fetch gas stock' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canManageGasStock(session.user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { gasType, brand, quantity, unit, supplier, supplierRef, notes } = body;

    const parsedQuantity = positiveNumber(quantity);
    const normalizedGasType = toRefrigerantLabel(cleanText(gasType, 60));
    const normalizedBrand = cleanText(brand, 120);
    const normalizedSupplier = cleanText(supplier, 180);
    const normalizedUnit = normalizeGasUnit(unit || 'kg');
    const stockKind = cleanText(body.stockKind || 'virgin', 20) as GasStockKind;
    const serialNumber = cleanText(body.serialNumber, 120);
    const tareWeightKg = body.tareWeightKg === undefined || body.tareWeightKg === '' ? null : Number(body.tareWeightKg);
    const certificationExpiresAt = body.certificationExpiresAt ? new Date(String(body.certificationExpiresAt)) : null;
    if (!normalizedGasType || !normalizedBrand || parsedQuantity === null || !normalizedSupplier || !normalizedUnit || !STOCK_KINDS.has(stockKind)
      || !serialNumber || (tareWeightKg !== null && (!Number.isFinite(tareWeightKg) || tareWeightKg < 0))
      || (certificationExpiresAt && Number.isNaN(certificationExpiresAt.getTime()))) {
      return NextResponse.json(
        { error: 'Select supported gas type, cylinder type, and unit, then provide brand, positive capacity, and supplier' },
        { status: 400 }
      );
    }

    const user = session.user as { id: string; name?: string | null };
    const { date } = formatHarareDateTime();
    const stockItem = await prisma.$transaction(async (tx) => {
      const created = await tx.gasStockItem.create({
        data: {
          gasType: normalizedGasType,
          brand: normalizedBrand,
          quantity: parsedQuantity,
          remaining: stockKind === 'virgin' ? parsedQuantity : 0,
          unit: normalizedUnit,
          stockKind,
          supplier: normalizedSupplier,
          supplierRef: cleanText(supplierRef, 120),
          addedBy: user.name || 'Admin',
          date,
          notes: cleanText(notes, 2_000) || null,
          serialNumber,
          tareWeightKg,
          certificationExpiresAt,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name || 'Unknown',
          action: 'create_gas_stock',
          jobId: null,
          reason: `${stockKind} cylinder added: ${parsedQuantity} ${normalizedUnit} ${normalizedGasType} ${normalizedBrand} from ${normalizedSupplier}`,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      });
      return created;
    });

    return NextResponse.json(stockItem, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Cylinder serial number is already in use' }, { status: 409 });
    }
    console.error('Error creating gas stock:', error);
    return NextResponse.json({ error: 'Failed to create gas stock' }, { status: 500 });
  }
}
