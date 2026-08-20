import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, positiveNumber } from '@/app/lib/serviceAuth';
import { canManageGasStock } from '@/app/lib/permissions';
import { RefrigerantType } from '@prisma/client';

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
    const normalizedGasType = cleanText(gasType, 60);
    const normalizedBrand = cleanText(brand, 120);
    const normalizedSupplier = cleanText(supplier, 180);
    if (!Object.values(RefrigerantType).includes(normalizedGasType as RefrigerantType) || !normalizedBrand || parsedQuantity === null || !normalizedSupplier) {
      return NextResponse.json(
        { error: 'Select a supported gas type and provide brand, positive quantity, and supplier' },
        { status: 400 }
      );
    }

    const stockItem = await prisma.gasStockItem.create({
      data: {
        gasType: normalizedGasType,
        brand: normalizedBrand,
        quantity: parsedQuantity,
        remaining: parsedQuantity,
        unit: cleanText(unit, 20) || 'kg',
        supplier: normalizedSupplier,
        supplierRef: cleanText(supplierRef, 120),
        addedBy: session.user.name || 'Admin',
        date: new Date().toISOString().split('T')[0],
        notes: cleanText(notes, 2_000) || null,
      },
    });

    const user = session.user as { id: string; name?: string | null };
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || 'Unknown',
        action: 'create_gas_stock',
        jobId: null,
        reason: `Gas stock added: ${quantity} ${unit || 'kg'} of ${gasType} ${brand} from ${supplier}`,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    }).catch(() => {});

    return NextResponse.json(stockItem, { status: 201 });
  } catch (error) {
    console.error('Error creating gas stock:', error);
    return NextResponse.json({ error: 'Failed to create gas stock' }, { status: 500 });
  }
}
