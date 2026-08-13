import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/app/lib/db';
import { QuotePDF } from '@/app/lib/pdf/quotePdf';
import { loadCompany } from '@/app/lib/pdf/company';
import { FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const quote = await prisma.quote.findUnique({ where: { id }, include: { customer: true, lineItems: true } });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  const company = await loadCompany();
  const buffer = await renderToBuffer(QuotePDF({ quote, company }));
  return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${quote.quoteRef}.pdf"` } });
}
