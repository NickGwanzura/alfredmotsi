import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// GET /api/gas-usage - List all gas usage records
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await prisma.gasUsageRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching gas usage:', error);
    return NextResponse.json({ error: 'Failed to fetch gas usage' }, { status: 500 });
  }
}

// POST /api/gas-usage - Record gas usage
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stockId, gasType, quantityUsed, customer, jobId, purpose } = body;

    // Validate required fields
    if (!stockId || !gasType || !quantityUsed || !customer || !jobId) {
      return NextResponse.json(
        { error: 'Stock ID, gas type, quantity used, customer, and job ID are required' },
        { status: 400 }
      );
    }

    const qty = parseFloat(quantityUsed);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }

    // Check if stock item exists and has enough remaining
    const stockItem = await prisma.gasStockItem.findUnique({
      where: { id: stockId },
    });

    if (!stockItem) {
      return NextResponse.json(
        { error: 'Gas stock item not found' },
        { status: 404 }
      );
    }

    if (stockItem.remaining < qty) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${stockItem.remaining} ${stockItem.unit} remaining` },
        { status: 400 }
      );
    }

    // Create usage record and update stock in a transaction
    const [usageRecord] = await prisma.$transaction([
      prisma.gasUsageRecord.create({
        data: {
          stockId,
          gasType,
          quantityUsed: qty,
          usedBy: session.user.id!,
          jobId,
          customer,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          purpose: purpose || '',
        },
      }),
      prisma.gasStockItem.update({
        where: { id: stockId },
        data: {
          remaining: {
            decrement: qty,
          },
        },
      }),
    ]);

    return NextResponse.json(usageRecord, { status: 201 });
  } catch (error) {
    console.error('Error recording gas usage:', error);
    return NextResponse.json({ error: 'Failed to record gas usage' }, { status: 500 });
  }
}
