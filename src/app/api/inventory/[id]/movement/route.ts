import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, positiveNumber, redactInventoryItem } from '@/app/lib/serviceAuth';
import { canManageInventory } from '@/app/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Keep stock movement permissions aligned with the inventory add form.
  if (!canManageInventory(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { type, quantity, reference, notes } = await req.json();
  if (!['in', 'out', 'adjustment'].includes(type)) return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
  const amount = positiveNumber(quantity);
  if (amount === null) return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id, isActive: true } });
    if (!item) throw new Error('NOT_FOUND');
    const delta = type === 'out' ? -amount : amount;
    const updatedCount = await tx.inventoryItem.updateMany({
      where: { id, isActive: true, ...(type === 'out' ? { stockLevel: { gte: amount } } : {}) },
      data: { stockLevel: { increment: delta } },
    });
    if (updatedCount.count !== 1) throw new Error('INSUFFICIENT_STOCK');
    const movement = await tx.inventoryMovement.create({
      data: { itemId: id, type, quantity: amount, reference: cleanText(reference, 200) || null, notes: cleanText(notes, 1000) || null, recordedBy: session.user.id },
    });
    const updated = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
    if (delta > 0) {
      await tx.inventoryStockAlarm.updateMany({ where: { itemId: id, status: 'open', requested: { lte: updated.stockLevel } }, data: { status: 'resolved', resolvedAt: new Date() } });
    }
    return { movement, updated };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'NOT_FOUND') return null;
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') return 'INSUFFICIENT_STOCK' as const;
    throw error;
  });
  if (result === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (result === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });

  return NextResponse.json({ movement: result.movement, item: redactInventoryItem(result.updated, session.user.role as string) });
}
