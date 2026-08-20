import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, nonNegativeNumber, positiveNumber } from '@/app/lib/serviceAuth';
import { canManageGasStock } from '@/app/lib/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageGasStock(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { gasType, brand, quantity, remaining, unit, supplier, supplierRef, notes } = body;
  const existing = await prisma.gasStockItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Gas stock item not found' }, { status: 404 });
  const parsedQuantity = quantity === undefined ? existing.quantity : positiveNumber(quantity);
  const parsedRemaining = remaining === undefined ? existing.remaining : nonNegativeNumber(remaining);
  if (parsedQuantity === null || parsedRemaining === null || parsedRemaining > parsedQuantity) {
    return NextResponse.json({ error: 'Quantity must be positive and remaining must be between zero and quantity' }, { status: 400 });
  }

  // Validate that remaining does not go negative or exceed original quantity
  const stockItem = await prisma.gasStockItem.update({
    where: { id },
    data: {
      ...(gasType !== undefined && { gasType: cleanText(gasType, 60) }),
      ...(brand !== undefined && { brand: cleanText(brand, 120) }),
      quantity: parsedQuantity,
      remaining: parsedRemaining,
      ...(unit !== undefined && { unit: cleanText(unit, 20) }),
      ...(supplier !== undefined && { supplier: cleanText(supplier, 180) }),
      ...(supplierRef !== undefined && { supplierRef: cleanText(supplierRef, 120) }),
      ...(notes !== undefined && { notes: cleanText(notes, 2_000) || null }),
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
