import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, cleanText, FINANCE_ROLES, makeReference, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import { isoDate } from '@/app/lib/financial';
import { redactPortalCode } from '@/app/lib/customerTransform';

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
        const validTypes = new Set(['installation', 'maintenance', 'repair', 'sales', 'inspection', 'callout']);
        const validUnits = new Set(['Split_System', 'Ducted', 'Package_Unit', 'Multi_Head', 'Cassette', 'VRV_VRF', 'Refrigeration_System', 'Chiller', 'Heat_Pump', 'Precision_Cooling']);
        const validIssues = new Set(['install', 'repair', 'service', 'quote']);
        const validPriorities = new Set(['emergency', 'urgent', 'high', 'normal', 'medium', 'low']);
        const jobDate = isoDate(body.date) || new Date().toISOString().slice(0, 10);
        const jobTime = /^\d{2}:\d{2}$/.test(String(body.time || '')) ? String(body.time) : '08:00';
        const requestedTechIds = Array.isArray(body.techIds) ? body.techIds.filter((techId: unknown): techId is string => typeof techId === 'string') : [];
        if (Array.isArray(body.techIds) && requestedTechIds.length !== body.techIds.length) throw new Error('INVALID_JOB_DATA');
        if (requestedTechIds.length && await tx.user.count({ where: { id: { in: requestedTechIds }, role: 'tech' } }) !== new Set(requestedTechIds).size) throw new Error('INVALID_JOB_DATA');
        if (!validTypes.has(body.type || 'repair') || !validUnits.has(body.unitType || 'Split_System') || !validIssues.has(body.issue || 'repair') || !validPriorities.has(body.priority || 'normal')) throw new Error('INVALID_JOB_DATA');
        job = await tx.job.create({ data: { source: 'admin', customerId: quote.customerId, title: cleanText(body.title, 200) || `Approved quote ${quote.quoteRef}`, type: body.type || 'repair', unitType: body.unitType || 'Split_System', issue: body.issue || 'repair', priority: body.priority || 'normal', date: jobDate, time: jobTime, status: 'scheduled', description: cleanText(body.description, 10_000) || quote.notes || `Work approved under ${quote.quoteRef}`, photos: [], alerts: [], jobCardRef: makeReference('JOB'), technicians: requestedTechIds.length ? { connect: requestedTechIds.map((techId: string) => ({ id: techId })) } : undefined } });
      }
      const dueDate = isoDate(body.dueDate) || isoDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      if (!dueDate) throw new Error('INVALID_DUE_DATE');
      const invoice = await tx.invoice.create({
        data: {
          invoiceRef: makeReference('INV'), customerId: quote.customerId, jobId: job?.id || quote.jobId, quoteId: quote.id,
          issueDate: new Date().toISOString().slice(0, 10), dueDate,
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
    const canViewPortalCode = ['owner', 'admin'].includes(session!.user.role);
    const safeQuote = 'customer' in result.quote ? { ...result.quote, customer: redactPortalCode(result.quote.customer, canViewPortalCode) } : result.quote;
    const safeInvoice = 'customer' in result.invoice ? { ...result.invoice, customer: redactPortalCode(result.invoice.customer, canViewPortalCode) } : result.invoice;
    return NextResponse.json({ ...result, quote: safeQuote, invoice: safeInvoice }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'INVALID_JOB_DATA') return NextResponse.json({ error: 'Invalid job details or technician assignments' }, { status: 400 });
    if (error instanceof Error && error.message === 'INVALID_DUE_DATE') return NextResponse.json({ error: 'Invalid invoice due date' }, { status: 400 });
    throw error;
  }
}
