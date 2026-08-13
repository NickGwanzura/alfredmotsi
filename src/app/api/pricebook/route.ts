import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { cleanText, FINANCE_ROLES, OPERATIONS_ROLES, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(request: NextRequest) {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES, 'tech']);
  if (error) return error;
  const category = request.nextUrl.searchParams.get('category');
  return NextResponse.json(await prisma.pricebookItem.findMany({
    where: { isActive: true, ...(category && { category }) },
    include: { inventoryItem: { select: { id: true, stockLevel: true, reorderLevel: true, sku: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  }));
}

export async function POST(request: NextRequest) {
  const { error } = await serviceSession([...FINANCE_ROLES, 'sales']);
  if (error) return error;
  const body = await request.json();
  const name = cleanText(body.name, 180);
  const code = cleanText(body.code, 50).toUpperCase();
  const category = cleanText(body.category, 80);
  const sellPrice = positiveNumber(body.sellPrice);
  if (!name || !code || !category || sellPrice === null) return NextResponse.json({ error: 'Name, code, category, and a positive selling price are required' }, { status: 400 });
  const item = await prisma.pricebookItem.create({
    data: { name, code, category, sellPrice, description: cleanText(body.description) || null, unit: cleanText(body.unit, 30) || 'each', costPrice: body.costPrice === '' || body.costPrice == null ? null : Number(body.costPrice), taxable: body.taxable !== false, inventoryItemId: cleanText(body.inventoryItemId, 100) || null },
  });
  return NextResponse.json(item, { status: 201 });
}
