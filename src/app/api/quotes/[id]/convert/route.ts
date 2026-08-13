import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, FINANCE_ROLES, makeReference, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id }, include: { lineItems: true, customer: true, invoice: true } });
      if (!quote) throw new Error('NOT_FOUND');
      if (quote.invoice) return { quote, invoice: quote.invoice, job: null };
      let job = quote.jobId ? await tx.job.findUnique({ where: { id: quote.jobId } }) : null;
      if (!job && body.createJob !== false) {
        job = await tx.job.create({ data: { source: 'admin', customerId: quote.customerId, title: body.title || `Approved quote ${quote.quoteRef}`, type: body.type || 'repair', unitType: body.unitType || 'Split_System', issue: body.issue || 'repair', priority: body.priority || 'normal', date: body.date || new Date().toISOString().slice(0, 10), time: body.time || '08:00', status: 'scheduled', description: body.description || quote.notes || `Work approved under ${quote.quoteRef}`, photos: [], alerts: [], jobCardRef: makeReference('JOB'), technicians: Array.isArray(body.techIds) ? { connect: body.techIds.map((techId: string) => ({ id: techId })) } : undefined } });
      }
      const invoice = await tx.invoice.create({
        data: {
          invoiceRef: makeReference('INV'), customerId: quote.customerId, jobId: job?.id || quote.jobId, quoteId: quote.id,
          issueDate: new Date().toISOString().slice(0, 10), dueDate: body.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          subtotal: quote.subtotal, discount: quote.discount, taxRate: quote.taxRate, tax: quote.tax, total: quote.total, balance: quote.total,
          notes: `Created from accepted quote ${quote.quoteRef}`,
          lineItems: { create: quote.lineItems.map((line) => ({ description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, total: line.total, itemId: line.itemId, pricebookItemId: line.pricebookItemId, category: line.category })) },
        },
        include: { lineItems: true, customer: true, payments: true },
      });
      const acceptedQuote = await tx.quote.update({ where: { id }, data: { status: 'accepted', acceptedAt: new Date(), jobId: job?.id || quote.jobId } });
      if (quote.leadId) await tx.lead.update({ where: { id: quote.leadId }, data: { status: 'booked' } });
      return { quote: acceptedQuote, invoice, job };
    });
    await auditServiceAction(session!, 'accept_quote', `Accepted and converted quote ${id}`, result.job?.id);
    await auditServiceAction(session!, 'create_invoice', `Created invoice ${result.invoice.invoiceRef} from quote ${id}`, result.job?.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    throw error;
  }
}
