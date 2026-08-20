import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auth } from '@/auth';
import { FINANCE_ROLES } from '@/app/lib/serviceAuth';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/app/lib/pdf/invoicePdf';
import { loadCompany } from '@/app/lib/pdf/company';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role as string;
  const isFinance = (FINANCE_ROLES as readonly string[]).includes(role);
  if (!isFinance && role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true, job: { select: { jobCardRef: true, title: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!isFinance) {
    const customer = await prisma.customer.findFirst({
      where: { id: session.user.id, email: session.user.email || '', portalEnabled: true },
      select: { id: true },
    });
    if (!customer || invoice.customerId !== customer.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const company = await loadCompany();
  const buffer = await renderToBuffer(InvoicePDF({ invoice, company }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoiceRef}.pdf"`,
    },
  });
}
