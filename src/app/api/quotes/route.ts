import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

function genRef() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `QUO-${y}${m}-${rand}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const quotes = await prisma.quote.findMany({
    include: { customer: { select: { name: true } }, lineItems: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { customerId, issueDate, validUntil, taxRate = 15, notes, lineItems } = await req.json();
  const subtotal: number = lineItems.reduce((s: number, l: { total: number }) => s + l.total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const quote = await prisma.quote.create({
    data: {
      quoteRef: genRef(),
      customerId,
      issueDate,
      validUntil,
      subtotal,
      taxRate,
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
    include: { lineItems: true, customer: { select: { name: true } } },
  });

  return NextResponse.json(quote, { status: 201 });
}
