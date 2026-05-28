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
