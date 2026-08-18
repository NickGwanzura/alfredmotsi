import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, serviceSession, cleanText, auditServiceAction } from '@/app/lib/serviceAuth';
import { isoDate } from '@/app/lib/financial';
import { isAdmin } from '@/app/lib/auth/auth';

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
  const { session, error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await ctx.params;
  const body = await req.json();
  const validStatuses = new Set(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled']);
  if (body.status !== undefined && !validStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
  }
  if (body.status === 'paid' || body.status === 'partial') {
    return NextResponse.json({ error: 'Use the payments endpoint to record invoice payments' }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.paidAt = null;
  }
  if (body.dueDate !== undefined) {
    const dueDate = isoDate(body.dueDate);
    if (!dueDate) return NextResponse.json({ error: 'dueDate must be a valid ISO date' }, { status: 400 });
    data.dueDate = dueDate;
  }
  if (body.notes !== undefined) data.notes = cleanText(body.notes, 5000) || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: 'No editable invoice fields supplied' }, { status: 400 });
  const invoice = await prisma.invoice.update({
    where: { id },
    data,
    include: { customer: true, lineItems: true, payments: { orderBy: { receivedAt: 'desc' } }, job: { select: { id: true, jobCardRef: true, title: true } } },
  });
  await auditServiceAction(session!, 'update_invoice', `Updated invoice ${invoice.invoiceRef}`);
  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { session, error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  if (!isAdmin(session!.user.role)) return NextResponse.json({ error: 'Only admins can delete invoices' }, { status: 403 });
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { invoiceRef: true } });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  await prisma.invoice.delete({ where: { id } });
  await auditServiceAction(session!, 'delete_invoice', `Deleted invoice ${invoice.invoiceRef}`);
  return NextResponse.json({ ok: true });
}
