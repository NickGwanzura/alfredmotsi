import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { cleanText, nonNegativeNumber, FIELD_ROLES, FINANCE_ROLES, redactInventoryItem, serviceSession } from '@/app/lib/serviceAuth';

function inventoryData(body: Record<string, unknown>) {
  const stockLevel = nonNegativeNumber(body.stockLevel);
  const reorderLevel = nonNegativeNumber(body.reorderLevel);
  const reorderQty = nonNegativeNumber(body.reorderQty);
  if (!cleanText(body.name, 180) || !cleanText(body.category, 80) || !cleanText(body.unit, 30) || stockLevel === null || reorderLevel === null || reorderQty === null) return null;
  const costPrice = body.costPrice == null || body.costPrice === '' ? null : nonNegativeNumber(body.costPrice);
  const sellPrice = body.sellPrice == null || body.sellPrice === '' ? null : nonNegativeNumber(body.sellPrice);
  if ((body.costPrice != null && body.costPrice !== '' && costPrice === null) || (body.sellPrice != null && body.sellPrice !== '' && sellPrice === null)) return null;
  return {
    name: cleanText(body.name, 180), category: cleanText(body.category, 80),
    brand: cleanText(body.brand, 120) || null, sku: cleanText(body.sku, 100) || null,
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
  if (!session?.user || !['owner', 'admin', 'accounts'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = inventoryData(body);
  if (!data) return NextResponse.json({ error: 'Name, category, unit, and valid stock levels are required' }, { status: 400 });
  const item = await prisma.inventoryItem.create({ data });
  return NextResponse.json(item, { status: 201 });
}
