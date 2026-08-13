import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { cleanText, FINANCE_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await serviceSession([...FINANCE_ROLES, 'sales']);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.pricebookItem.update({ where: { id }, data: { ...(body.name !== undefined && { name: cleanText(body.name, 180) }), ...(body.category !== undefined && { category: cleanText(body.category, 80) }), ...(body.description !== undefined && { description: cleanText(body.description) || null }), ...(body.unit !== undefined && { unit: cleanText(body.unit, 30) }), ...(body.sellPrice !== undefined && { sellPrice: Number(body.sellPrice) }), ...(body.costPrice !== undefined && { costPrice: body.costPrice == null ? null : Number(body.costPrice) }), ...(body.taxable !== undefined && { taxable: Boolean(body.taxable) }), ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }) } });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await params;
  return NextResponse.json(await prisma.pricebookItem.update({ where: { id }, data: { isActive: false } }));
}
