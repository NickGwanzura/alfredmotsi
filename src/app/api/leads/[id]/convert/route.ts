import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { JobType, UnitType } from '@prisma/client';
import { auditServiceAction, cleanText, makeReference, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

type QuoteLineInput = { description?: unknown; quantity?: unknown; unitPrice?: unknown; category?: unknown; pricebookItemId?: string; itemId?: string };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const mode = body.mode as 'customer' | 'quote' | 'job';
  if (!['customer', 'quote', 'job'].includes(mode)) return NextResponse.json({ error: 'Conversion mode must be customer, quote, or job' }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id }, include: { customer: true } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    let customer = lead.customer;
    if (!customer) {
      const email = (lead.email || `${lead.id}@lead.local`).toLowerCase();
      customer = await tx.customer.upsert({
        where: { email },
        update: {},
        create: {
          name: lead.name, phone: lead.phone, whatsapp: lead.whatsapp, email,
          address: lead.address || 'Address to be confirmed', notes: `Converted from ${lead.source} lead`,
          portalCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
        },
      });
      await tx.lead.update({ where: { id }, data: { customerId: customer.id } });
    }
    if (mode === 'customer') {
      await tx.lead.update({ where: { id }, data: { status: 'contacted' } });
      return { customer };
    }
    if (mode === 'quote') {
      const lines: QuoteLineInput[] = Array.isArray(body.lineItems) && body.lineItems.length ? body.lineItems : [{ description: lead.serviceType || lead.description, quantity: 1, unitPrice: 0 }];
      const subtotal = lines.reduce((sum: number, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0);
      const discount = Math.max(0, Number(body.discount || 0));
      const taxRate = Number(body.taxRate ?? 15.5);
      const tax = Math.max(0, subtotal - discount) * taxRate / 100;
      const quote = await tx.quote.create({
        data: {
          quoteRef: makeReference('QUO'), customerId: customer.id, leadId: id,
          issueDate: cleanText(body.issueDate, 10) || new Date().toISOString().slice(0, 10),
          validUntil: cleanText(body.validUntil, 10) || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          tier: body.tier || 'standard', subtotal, discount, taxRate, tax, total: subtotal - discount + tax,
          terms: cleanText(body.terms) || 'Quotation valid until the date shown. Parts availability is subject to confirmation.',
          notes: cleanText(body.notes) || null,
          lineItems: { create: lines.map((line) => ({ description: cleanText(line.description, 500), quantity: Number(line.quantity || 1), unitPrice: Number(line.unitPrice || 0), total: Number(line.quantity || 1) * Number(line.unitPrice || 0), category: cleanText(line.category, 60) || 'service', pricebookItemId: line.pricebookItemId || null, itemId: line.itemId || null })) },
        },
        include: { lineItems: true, customer: true },
      });
      await tx.lead.update({ where: { id }, data: { status: 'quoted' } });
      return { customer, quote };
    }
    const job = await tx.job.create({
      data: {
        source: 'admin', customerId: customer.id, leadId: id,
        siteId: cleanText(body.siteId, 100) || null, equipmentId: cleanText(body.equipmentId, 100) || null,
        title: cleanText(body.title, 200) || lead.serviceType || 'HVAC service enquiry',
        type: (body.type || 'repair') as JobType, unitType: (body.unitType || 'Split_System') as UnitType,
        issue: body.issue || 'repair', priority: lead.priority,
        date: cleanText(body.date, 10) || new Date().toISOString().slice(0, 10), time: cleanText(body.time, 5) || '08:00',
        durationMinutes: Math.max(30, Number(body.durationMinutes || 120)), status: 'scheduled',
        description: lead.description, photos: [], alerts: [], jobCardRef: makeReference('JOB'),
        technicians: Array.isArray(body.techIds) ? { connect: body.techIds.map((techId: string) => ({ id: techId })) } : undefined,
      },
      include: { customer: true, technicians: true },
    });
    await tx.lead.update({ where: { id }, data: { status: 'booked' } });
    return { customer, job };
  });

  await auditServiceAction(session!, 'convert_lead', `Converted lead ${id} to ${mode}`, 'job' in result ? result.job?.id : null);
  return NextResponse.json(result, { status: 201 });
}
