import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { Prisma } from '@prisma/client';
import { isAdmin } from '@/app/lib/auth/auth';
import { auditServiceAction, cleanText, FIELD_ROLES, FINANCE_ROLES, nonNegativeNumber, redactInventoryItem, serviceSession } from '@/app/lib/serviceAuth';
import { INVENTORY_CATEGORIES } from '@/app/lib/config';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...FIELD_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { movements: { orderBy: { recordedAt: 'desc' }, take: 50 } },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...redactInventoryItem(item, session!.user.role as string), movements: item.movements });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
  const data: Record<string, unknown> = {};
  for (const key of ['name', 'category', 'brand', 'sku', 'unit', 'supplier', 'supplierRef', 'model', 'capacity', 'voltage', 'serialNumber', 'location', 'notes']) {
    if (body[key] !== undefined) data[key] = cleanText(body[key], key === 'notes' ? 5000 : 180) || null;
  }
  if (body.category !== undefined && !INVENTORY_CATEGORIES.includes(String(data.category) as typeof INVENTORY_CATEGORIES[number])) {
    return NextResponse.json({ error: 'Invalid inventory category' }, { status: 400 });
  }
  const requestedStock = body.stockLevel === undefined ? null : nonNegativeNumber(body.stockLevel);
  if (body.stockLevel !== undefined && requestedStock === null) return NextResponse.json({ error: 'Invalid stockLevel' }, { status: 400 });
  for (const key of ['stockLevel', 'reorderLevel', 'reorderQty', 'costPrice', 'sellPrice']) {
    if (key === 'stockLevel') continue;
    if (body[key] !== undefined) {
      const value = nonNegativeNumber(body[key]);
      if (value === null) return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      data[key] = value;
    }
  }
  if (body.isActive !== undefined) data.isActive = body.isActive === true;
  if (!Object.keys(data).length && requestedStock === null) return NextResponse.json({ error: 'No editable inventory fields supplied' }, { status: 400 });
  try {
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id }, data: { ...data, ...(requestedStock === null ? {} : { stockLevel: requestedStock }) } });
      if (requestedStock !== null && requestedStock !== existing.stockLevel) {
        const delta = requestedStock - existing.stockLevel;
        await tx.inventoryMovement.create({
          data: {
            itemId: id,
            type: delta > 0 ? 'in' : 'out',
            quantity: Math.abs(delta),
            reference: 'Admin stock adjustment',
            notes: `Stock level changed from ${existing.stockLevel} to ${requestedStock}`,
            recordedBy: session.user.id,
          },
        });
        if (delta > 0) {
          await tx.inventoryStockAlarm.updateMany({ where: { itemId: id, status: 'open', requested: { lte: requestedStock } }, data: { status: 'resolved', resolvedAt: new Date() } });
        }
      }
      return updated;
    });
    await auditServiceAction(session, 'adjust_stock', `Updated inventory item ${id}${requestedStock !== null ? ` to ${requestedStock}` : ''}`);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
