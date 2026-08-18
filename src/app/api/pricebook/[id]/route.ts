import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { cleanText, FINANCE_ROLES, nonNegativeNumber, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...FINANCE_ROLES, 'sales']);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  if (session!.user.role === 'sales' && body.costPrice !== undefined) return NextResponse.json({ error: 'Sales users cannot change cost prices' }, { status: 403 });
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = cleanText(body.name, 180);
  if (body.category !== undefined) data.category = cleanText(body.category, 80);
  if (body.description !== undefined) data.description = cleanText(body.description) || null;
  if (body.unit !== undefined) data.unit = cleanText(body.unit, 30);
  if (body.sellPrice !== undefined) {
    const sellPrice = positiveNumber(body.sellPrice);
    if (sellPrice === null) return NextResponse.json({ error: 'Selling price must be positive' }, { status: 400 });
    data.sellPrice = sellPrice;
  }
  if (body.costPrice !== undefined) {
    const costPrice = body.costPrice == null || body.costPrice === '' ? null : nonNegativeNumber(body.costPrice);
    if (body.costPrice !== null && body.costPrice !== '' && costPrice === null) return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 });
    data.costPrice = costPrice;
  }
  if (body.taxable !== undefined) data.taxable = Boolean(body.taxable);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (!Object.keys(data).length) return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
  const item = await prisma.pricebookItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await params;
  return NextResponse.json(await prisma.pricebookItem.update({ where: { id }, data: { isActive: false } }));
}
