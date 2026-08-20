import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, canAccessJob, FIELD_ROLES, positiveNumber, redactInventoryItem, serviceSession } from '@/app/lib/serviceAuth';

function redactPartUsage<T extends Record<string, unknown>>(usage: T, role: string): T {
  const safeUsage = { ...usage };
  if (!['owner', 'admin', 'accounts'].includes(role)) {
    delete safeUsage.unitCost;
    delete safeUsage.unitPrice;
  }
  const item = (safeUsage as Record<string, unknown>).item;
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    (safeUsage as Record<string, unknown>).item = redactInventoryItem(item as Record<string, unknown>, role);
  }
  return safeUsage;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const { id } = await params;
  if (!session || !await canAccessJob(session.user.id!, session.user.role as string, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const usages = await prisma.jobPartUsage.findMany({ where: { jobId: id }, include: { item: true }, orderBy: { recordedAt: 'desc' } });
  return NextResponse.json(usages.map((usage) => redactPartUsage(usage, session!.user.role as string)));
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
      const item = await tx.inventoryItem.findUnique({ where: { id: body.itemId }, select: { id: true, name: true, stockLevel: true, costPrice: true, sellPrice: true } });
      if (!item) throw new Error('ITEM_NOT_FOUND');
      // Conditional decrement prevents two concurrent job cards from taking
      // the same stock and guarantees inventory never goes negative.
      const deducted = await tx.inventoryItem.updateMany({
        where: { id: item.id, stockLevel: { gte: quantity } },
        data: { stockLevel: { decrement: quantity } },
      });
      if (deducted.count !== 1) throw new Error('INSUFFICIENT_STOCK');
      const created = await tx.jobPartUsage.create({ data: { jobId: id, itemId: item.id, quantity, unitCost: item.costPrice, unitPrice: item.sellPrice, notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null, recordedBy: session!.user.id } });
      await tx.inventoryMovement.create({ data: { itemId: item.id, jobId: id, type: 'out', quantity, reference: body.reference || `Job ${id}`, notes: 'Used on job', recordedBy: session!.user.id } });
      return tx.jobPartUsage.findUnique({ where: { id: created.id }, include: { item: true } });
    });
    await auditServiceAction(session!, 'use_job_part', `Used ${quantity} of inventory item ${body.itemId}`, id);
    return NextResponse.json(usage ? redactPartUsage(usage, session!.user.role as string) : usage, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      await auditServiceAction(session!, 'adjust_stock', `Stock alarm: ${quantity} requested for inventory item ${body.itemId} on job ${id}`, id);
      const current = await prisma.inventoryItem.findUnique({ where: { id: body.itemId }, select: { name: true, stockLevel: true, unit: true } });
      return NextResponse.json({
        error: 'Insufficient stock',
        alarm: true,
        itemName: current?.name || 'Inventory item',
        available: current?.stockLevel ?? 0,
        requested: quantity,
        unit: current?.unit || 'units',
      }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'ITEM_NOT_FOUND') return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    throw error;
  }
}
