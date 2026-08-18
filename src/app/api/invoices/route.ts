import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, serviceSession, auditServiceAction } from '@/app/lib/serviceAuth';
import { calculateTotals, isoDate, parseLineItems } from '@/app/lib/financial';

function genRef(prefix: string) {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}-${rand}`;
}

export async function GET() {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const invoices = await prisma.invoice.findMany({
    include: { customer: { select: { name: true, email: true, phone: true, address: true } }, lineItems: true, payments: { orderBy: { receivedAt: 'desc' } }, job: { select: { id: true, jobCardRef: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const { session, error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;

  const { customerId, jobId, quoteId, dueDate, taxRate = 15.5, discount = 0, notes, lineItems } = await req.json();
  const items = parseLineItems(lineItems);
  const totals = calculateTotals(items || [], taxRate, discount);
  const safeDueDate = isoDate(dueDate);
  if (!customerId || !safeDueDate || !items || !totals) {
    return NextResponse.json({ error: 'Customer, valid due date, and valid line items are required' }, { status: 400 });
  }
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const itemIds = [...new Set(items.flatMap((item) => item.itemId ? [item.itemId] : []))];
  const pricebookIds = [...new Set(items.flatMap((item) => item.pricebookItemId ? [item.pricebookItemId] : []))];
  const [inventoryCount, pricebookCount] = await Promise.all([
    itemIds.length ? prisma.inventoryItem.count({ where: { id: { in: itemIds } } }) : 0,
    pricebookIds.length ? prisma.pricebookItem.count({ where: { id: { in: pricebookIds } } }) : 0,
  ]);
  if (inventoryCount !== itemIds.length || pricebookCount !== pricebookIds.length) {
    return NextResponse.json({ error: 'A line item references an unknown catalogue item' }, { status: 400 });
  }
  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { customerId: true } });
    if (!job || job.customerId !== customerId) return NextResponse.json({ error: 'Job does not belong to customer' }, { status: 400 });
  }
  if (quoteId) {
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { customerId: true } });
    if (!quote || quote.customerId !== customerId) return NextResponse.json({ error: 'Quote does not belong to customer' }, { status: 400 });
  }
  const today = new Date().toISOString().split('T')[0];

  const invoice = await prisma.invoice.create({
    data: {
      invoiceRef: genRef('INV'),
      customerId,
      jobId: jobId || null,
      quoteId: quoteId || null,
      issueDate: today,
      dueDate: safeDueDate,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxRate: totals.taxRate,
      tax: totals.tax,
      total: totals.total,
      balance: totals.total,
      notes,
      lineItems: {
        create: items,
      },
    },
    include: { lineItems: true, payments: true, customer: { select: { name: true, email: true, phone: true, address: true } }, job: { select: { id: true, jobCardRef: true, title: true } } },
  });

  await auditServiceAction(session!, 'create_invoice', `Created invoice ${invoice.invoiceRef}`, jobId || null);

  return NextResponse.json(invoice, { status: 201 });
}
