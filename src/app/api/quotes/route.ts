import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, OPERATIONS_ROLES, serviceSession, auditServiceAction } from '@/app/lib/serviceAuth';

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
  if (!customerId || !validUntil || !Array.isArray(lineItems) || !lineItems.length) return NextResponse.json({ error: 'Customer, valid-until date, and line items are required' }, { status: 400 });
  const subtotal: number = lineItems.reduce((s: number, l: { total: number }) => s + l.total, 0);
  const safeDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal));
  const tax = (subtotal - safeDiscount) * (taxRate / 100);
  const total = subtotal - safeDiscount + tax;

  const quote = await prisma.quote.create({
    data: {
      quoteRef: genRef(),
      customerId,
      jobId: jobId || null,
      leadId: leadId || null,
      tier,
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      validUntil,
      subtotal,
      discount: safeDiscount,
      taxRate,
      tax,
      total,
      notes,
      terms,
      lineItems: {
        create: lineItems.map((l: { description: string; quantity: number; unitPrice: number; total: number; itemId?: string }) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
          itemId: l.itemId || null,
          pricebookItemId: (l as any).pricebookItemId || null,
          category: (l as any).category || 'service',
        })),
      },
    },
    include: { lineItems: true, customer: { select: { name: true } } },
  });

  if (leadId) await prisma.lead.update({ where: { id: leadId }, data: { status: 'quoted' } }).catch(() => undefined);
  await auditServiceAction(session!, 'create_quote', `Created quote ${quote.quoteRef}`, jobId || null);

  return NextResponse.json(quote, { status: 201 });
}
