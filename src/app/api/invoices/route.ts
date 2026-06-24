import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

function genRef(prefix: string) {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}-${rand}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const invoices = await prisma.invoice.findMany({
    include: { customer: { select: { name: true, email: true, phone: true, address: true } }, lineItems: true, job: { select: { id: true, jobCardRef: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { customerId, jobId, dueDate, taxRate = 15.5, notes, lineItems } = await req.json();

  if (!customerId || !dueDate || !lineItems?.length) {
    return NextResponse.json({ error: 'Customer, due date, and line items are required' }, { status: 400 });
  }

  for (const item of lineItems) {
    if (!item.description) {
      return NextResponse.json({ error: 'All line items must have a description' }, { status: 400 });
    }
  }

  const subtotal = lineItems.reduce((s: number, l: { total: number }) => s + (l.total || 0), 0);
  const rate = parseFloat(String(taxRate)) || 15.5;
  const tax = subtotal * (rate / 100);
  const total = subtotal + tax;
  const today = new Date().toISOString().split('T')[0];

  const invoice = await prisma.invoice.create({
    data: {
      invoiceRef: genRef('INV'),
      customerId,
      jobId: jobId || null,
      issueDate: today,
      dueDate,
      subtotal,
      taxRate: rate,
      tax,
      total,
      notes,
      lineItems: {
        create: lineItems.map((l: { description: string; quantity: number; unitPrice: number; total: number; itemId?: string }) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
          itemId: l.itemId || null,
        })),
      },
    },
    include: { lineItems: true, customer: { select: { name: true, email: true, phone: true, address: true } }, job: { select: { id: true, jobCardRef: true, title: true } } },
  });

  return NextResponse.json(invoice, { status: 201 });
}
