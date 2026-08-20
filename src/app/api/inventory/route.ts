import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { Prisma } from '@prisma/client';
import { cleanText, nonNegativeNumber, FIELD_ROLES, FINANCE_ROLES, redactInventoryItem, serviceSession } from '@/app/lib/serviceAuth';
import { canManageInventory, canViewFinancials } from '@/app/lib/permissions';
import { INVENTORY_CATEGORIES } from '@/app/lib/config';

function inventoryData(body: Record<string, unknown>) {
  const stockLevel = nonNegativeNumber(body.stockLevel);
  const reorderLevel = nonNegativeNumber(body.reorderLevel);
  const reorderQty = nonNegativeNumber(body.reorderQty);
  const category = cleanText(body.category, 80);
  if (!cleanText(body.name, 180) || !INVENTORY_CATEGORIES.includes(category as typeof INVENTORY_CATEGORIES[number]) || !cleanText(body.unit, 30) || stockLevel === null || reorderLevel === null || reorderQty === null) return null;
  const costPrice = body.costPrice == null || body.costPrice === '' ? null : nonNegativeNumber(body.costPrice);
  const sellPrice = body.sellPrice == null || body.sellPrice === '' ? null : nonNegativeNumber(body.sellPrice);
  if ((body.costPrice != null && body.costPrice !== '' && costPrice === null) || (body.sellPrice != null && body.sellPrice !== '' && sellPrice === null)) return null;
  return {
    name: cleanText(body.name, 180), category,
    brand: cleanText(body.brand, 120) || null, sku: cleanText(body.sku, 100) || null,
    model: cleanText(body.model, 120) || null, capacity: cleanText(body.capacity, 80) || null,
    voltage: cleanText(body.voltage, 80) || null, serialNumber: cleanText(body.serialNumber, 160) || null,
    unit: cleanText(body.unit, 30), stockLevel, reorderLevel, reorderQty,
    supplier: cleanText(body.supplier, 180) || null, supplierRef: cleanText(body.supplierRef, 120) || null,
    costPrice, sellPrice,
    location: cleanText(body.location, 180) || null, notes: cleanText(body.notes, 5000) || null,
  };
}

export async function GET() {
  const { session, error } = await serviceSession([...FIELD_ROLES, ...FINANCE_ROLES]);
  if (error) return error;

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    take: 500,
  });
  return NextResponse.json(items.map((item) => redactInventoryItem(item, session!.user.role as string)));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageInventory(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = inventoryData(body);
  if (!data) return NextResponse.json({ error: 'Name, category, unit, and valid stock levels are required' }, { status: 400 });
  const safeData = canViewFinancials(session.user.role as string)
    ? data
    : { ...data, costPrice: null, sellPrice: null };
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: safeData });
      if (created.stockLevel > 0) {
        await tx.inventoryMovement.create({
          data: { itemId: created.id, type: 'in', quantity: created.stockLevel, reference: 'Opening balance', notes: 'Initial stock on item creation', recordedBy: session.user.id },
        });
      }
      return created;
    });
    return NextResponse.json(redactInventoryItem(item, session.user.role as string), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    }
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}
