import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admins and technicians may adjust inventory stock levels.
  const forbidden = authorizeRole(session, ['admin', 'tech']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const { type, quantity, reference, notes } = await req.json();

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const delta = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);
  const newLevel = item.stockLevel + delta;
  if (newLevel < 0) return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });

  const [movement, updated] = await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: { itemId: id, type, quantity: Math.abs(quantity), reference, notes, recordedBy: session.user.id },
    }),
    prisma.inventoryItem.update({ where: { id }, data: { stockLevel: newLevel } }),
  ]);

  return NextResponse.json({ movement, item: updated });
}
