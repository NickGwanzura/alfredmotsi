import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { cleanText, FINANCE_ROLES, OPERATIONS_ROLES, nonNegativeNumber, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';
import { canViewFinancials } from '@/app/lib/permissions';

function redactCostPrice<T extends { costPrice?: unknown }>(item: T, role: string): Omit<T, 'costPrice'> | T {
  if (canViewFinancials(role)) return item;
  const safeItem = { ...item };
  delete safeItem.costPrice;
  return safeItem;
}

export async function GET(request: NextRequest) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES, 'tech']);
  if (error) return error;
  const category = request.nextUrl.searchParams.get('category');
  const items = await prisma.pricebookItem.findMany({
    where: { isActive: true, ...(category && { category }) },
    include: { inventoryItem: { select: { id: true, stockLevel: true, reorderLevel: true, sku: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: 500,
  });
  return NextResponse.json(items.map((item) => redactCostPrice(item, session!.user.role)));
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession([...FINANCE_ROLES, 'sales']);
  if (error) return error;
  const body = await request.json();
  const name = cleanText(body.name, 180);
  const code = cleanText(body.code, 50).toUpperCase();
  const category = cleanText(body.category, 80);
  const sellPrice = positiveNumber(body.sellPrice);
  if (!name || !code || !category || sellPrice === null) return NextResponse.json({ error: 'Name, code, category, and a positive selling price are required' }, { status: 400 });
  if (session!.user.role === 'sales' && body.costPrice !== undefined) return NextResponse.json({ error: 'Sales users cannot set cost prices' }, { status: 403 });
  const costPrice = body.costPrice === '' || body.costPrice == null ? null : nonNegativeNumber(body.costPrice);
  if (body.costPrice !== undefined && body.costPrice !== '' && costPrice === null) return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 });
  const inventoryItemId = cleanText(body.inventoryItemId, 100) || null;
  if (inventoryItemId && !await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId }, select: { id: true } })) return NextResponse.json({ error: 'Inventory item not found' }, { status: 400 });
  const item = await prisma.pricebookItem.create({
    data: { name, code, category, sellPrice, description: cleanText(body.description) || null, unit: cleanText(body.unit, 30) || 'each', costPrice, taxable: body.taxable !== false, inventoryItemId },
  });
  return NextResponse.json(redactCostPrice(item, session!.user.role), { status: 201 });
}
