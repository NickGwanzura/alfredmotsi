import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { isAdmin } from '@/app/lib/auth/auth';
import { cleanText, FIELD_ROLES, FINANCE_ROLES, nonNegativeNumber, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await serviceSession([...FIELD_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { movements: { orderBy: { recordedAt: 'desc' }, take: 50 } },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ['name', 'category', 'brand', 'sku', 'unit', 'supplier', 'supplierRef', 'location', 'notes']) {
    if (body[key] !== undefined) data[key] = cleanText(body[key], key === 'notes' ? 5000 : 180) || null;
  }
  for (const key of ['stockLevel', 'reorderLevel', 'reorderQty', 'costPrice', 'sellPrice']) {
    if (body[key] !== undefined) {
      const value = nonNegativeNumber(body[key]);
      if (value === null) return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      data[key] = value;
    }
  }
  if (body.isActive !== undefined) data.isActive = body.isActive === true;
  if (!Object.keys(data).length) return NextResponse.json({ error: 'No editable inventory fields supplied' }, { status: 400 });
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  return NextResponse.json(item);
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
