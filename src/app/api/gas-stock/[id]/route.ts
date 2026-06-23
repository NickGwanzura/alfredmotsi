import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forbidden = authorizeRole(session, ['admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();
  const { gasType, brand, quantity, remaining, unit, supplier, supplierRef, notes } = body;

  // Validate that remaining does not go negative or exceed original quantity
  if (remaining !== undefined) {
    const parsed = parseFloat(remaining);
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Remaining quantity cannot be negative' }, { status: 400 });
    }
    if (quantity !== undefined) {
      const parsedQty = parseFloat(quantity);
      if (!isNaN(parsedQty) && parsed > parsedQty) {
        return NextResponse.json({ error: 'Remaining cannot exceed total quantity' }, { status: 400 });
      }
    }
  }

  const stockItem = await prisma.gasStockItem.update({
    where: { id },
    data: {
      ...(gasType !== undefined && { gasType }),
      ...(brand !== undefined && { brand }),
      ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
      ...(remaining !== undefined && { remaining: parseFloat(remaining) }),
      ...(unit !== undefined && { unit }),
      ...(supplier !== undefined && { supplier }),
      ...(supplierRef !== undefined && { supplierRef }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json(stockItem);
}

// Support both PUT and PATCH for frontend compatibility
export const PATCH = PUT;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forbidden = authorizeRole(session, ['admin']);
  if (forbidden) return forbidden;

  const { id } = await params;

  await prisma.gasStockItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
