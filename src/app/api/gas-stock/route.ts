import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// GET /api/gas-stock - List all gas stock
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stock = await prisma.gasStockItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error fetching gas stock:', error);
    return NextResponse.json({ error: 'Failed to fetch gas stock' }, { status: 500 });
  }
}

// POST /api/gas-stock - Add new gas stock
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gasType, brand, quantity, unit, supplier, supplierRef, notes } = body;

    // Validate required fields
    if (!gasType || !brand || !quantity || !supplier) {
      return NextResponse.json(
        { error: 'Gas type, brand, quantity, and supplier are required' },
        { status: 400 }
      );
    }

    const stockItem = await prisma.gasStockItem.create({
      data: {
        gasType,
        brand,
        quantity: parseFloat(quantity),
        remaining: parseFloat(quantity),
        unit: unit || 'kg',
        supplier,
        supplierRef: supplierRef || '',
        addedBy: session.user.name || 'Admin',
        date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      },
    });

    // Audit log
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
