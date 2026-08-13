import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, serviceSession, cleanText } from '@/app/lib/serviceAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true, payments: { orderBy: { receivedAt: 'desc' } }, job: { select: { jobCardRef: true, title: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await ctx.params;
  const body = await req.json();
  const validStatuses = new Set(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled']);
  if (body.status !== undefined && !validStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.paidAt = body.status === 'paid' ? new Date() : null;
  }
  if (body.dueDate !== undefined) data.dueDate = cleanText(body.dueDate, 10);
  if (body.notes !== undefined) data.notes = cleanText(body.notes, 5000) || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: 'No editable invoice fields supplied' }, { status: 400 });
  const invoice = await prisma.invoice.update({
    where: { id },
    data,
    include: { customer: true, lineItems: true, payments: { orderBy: { receivedAt: 'desc' } }, job: { select: { id: true, jobCardRef: true, title: true } } },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await ctx.params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
