import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, positiveNumber } from '@/app/lib/serviceAuth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admins and technicians may adjust inventory stock levels.
  const forbidden = authorizeRole(session, ['admin', 'tech']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const { type, quantity, reference, notes } = await req.json();
  if (!['in', 'out', 'adjustment'].includes(type)) return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
  const amount = positiveNumber(quantity);
  if (amount === null) return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new Error('NOT_FOUND');
    const delta = type === 'out' ? -amount : amount;
    const newLevel = item.stockLevel + delta;
    if (newLevel < 0) throw new Error('INSUFFICIENT_STOCK');
    const movement = await tx.inventoryMovement.create({
      data: { itemId: id, type, quantity: amount, reference: cleanText(reference, 200) || null, notes: cleanText(notes, 1000) || null, recordedBy: session.user.id },
    });
    const updated = await tx.inventoryItem.update({ where: { id }, data: { stockLevel: newLevel } });
    return { movement, updated };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'NOT_FOUND') return null;
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') return 'INSUFFICIENT_STOCK' as const;
    throw error;
  });
  if (result === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (result === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });

  return NextResponse.json({ movement: result.movement, item: result.updated });
}
