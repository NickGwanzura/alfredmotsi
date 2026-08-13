import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, canAccessJob, FIELD_ROLES, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const { id } = await params;
  if (!session || !await canAccessJob(session.user.id!, session.user.role as string, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.jobPartUsage.findMany({ where: { jobId: id }, include: { item: true }, orderBy: { recordedAt: 'desc' } }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const { id } = await params;
  if (!await canAccessJob(session!.user.id!, session!.user.role as string, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const quantity = positiveNumber(body.quantity);
  if (!body.itemId || quantity === null) return NextResponse.json({ error: 'Inventory item and positive quantity required' }, { status: 400 });
  try {
    const usage = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: body.itemId } });
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (item.stockLevel < quantity) throw new Error('INSUFFICIENT_STOCK');
      const created = await tx.jobPartUsage.create({ data: { jobId: id, itemId: item.id, quantity, unitCost: item.costPrice, unitPrice: item.sellPrice, notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null, recordedBy: session!.user.id } });
      await tx.inventoryItem.update({ where: { id: item.id }, data: { stockLevel: { decrement: quantity } } });
      await tx.inventoryMovement.create({ data: { itemId: item.id, jobId: id, type: 'out', quantity, reference: body.reference || `Job ${id}`, notes: 'Used on job', recordedBy: session!.user.id } });
      return tx.jobPartUsage.findUnique({ where: { id: created.id }, include: { item: true } });
    });
    await auditServiceAction(session!, 'use_job_part', `Used ${quantity} of inventory item ${body.itemId}`, id);
    return NextResponse.json(usage, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Insufficient stock' }, { status: 409 });
    if (error instanceof Error && error.message === 'ITEM_NOT_FOUND') return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    throw error;
  }
}
