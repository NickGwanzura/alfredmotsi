import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, OPERATIONS_ROLES, serviceSession, auditServiceAction } from '@/app/lib/serviceAuth';
import { calculateTotals, isoDate, parseLineItems } from '@/app/lib/financial';

function genRef() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `QUO-${y}${m}-${rand}`;
}

export async function GET() {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const quotes = await prisma.quote.findMany({
    include: { customer: { select: { name: true, email: true, phone: true } }, lineItems: true, lead: { select: { id: true, name: true } }, job: { select: { id: true, jobCardRef: true } }, invoice: { select: { id: true, invoiceRef: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;

  const { customerId, jobId, leadId, issueDate, validUntil, tier = 'custom', taxRate = 15.5, discount = 0, terms, notes, lineItems } = await req.json();
  const items = parseLineItems(lineItems);
  const totals = calculateTotals(items || [], taxRate, discount);
  const safeIssueDate = issueDate == null ? new Date().toISOString().slice(0, 10) : isoDate(issueDate);
  const safeValidUntil = isoDate(validUntil);
  if (!customerId || !safeValidUntil || !safeIssueDate || !items || !totals) return NextResponse.json({ error: 'Customer, valid dates, and valid line items are required' }, { status: 400 });
  if (!['basic', 'standard', 'premium', 'custom'].includes(tier)) return NextResponse.json({ error: 'Invalid quote tier' }, { status: 400 });
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
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customerId: true } });
    if (!lead || (lead.customerId && lead.customerId !== customerId)) return NextResponse.json({ error: 'Lead does not belong to customer' }, { status: 400 });
  }

  const quote = await prisma.quote.create({
    data: {
      quoteRef: genRef(),
      customerId,
      jobId: jobId || null,
      leadId: leadId || null,
      tier,
      issueDate: safeIssueDate,
      validUntil: safeValidUntil,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxRate: totals.taxRate,
      tax: totals.tax,
      total: totals.total,
      notes,
      terms,
      lineItems: {
        create: items,
      },
    },
    include: { lineItems: true, customer: { select: { name: true } } },
  });

  if (leadId) await prisma.lead.update({ where: { id: leadId }, data: { status: 'quoted' } }).catch(() => undefined);
  await auditServiceAction(session!, 'create_quote', `Created quote ${quote.quoteRef}`, jobId || null);

  return NextResponse.json(quote, { status: 201 });
}
