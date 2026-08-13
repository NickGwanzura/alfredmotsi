import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { serviceSession, FINANCE_ROLES } from '@/app/lib/serviceAuth';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/app/lib/pdf/invoicePdf';
import { loadCompany } from '@/app/lib/pdf/company';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true, job: { select: { jobCardRef: true, title: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const company = await loadCompany();
  const buffer = await renderToBuffer(InvoicePDF({ invoice, company }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoiceRef}.pdf"`,
    },
  });
}
