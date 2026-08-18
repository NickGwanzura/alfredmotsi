import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { JobType, UnitType } from '@prisma/client';
import { auditServiceAction, cleanText, makeReference, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import crypto from 'node:crypto';
import { calculateTotals, isoDate, parseLineItems } from '@/app/lib/financial';
import { redactPortalCode } from '@/app/lib/customerTransform';

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

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    let customer = lead.customer;
    if (!customer) {
      const email = (lead.email || `${lead.id}@lead.local`).toLowerCase();
      customer = await tx.customer.upsert({
        where: { email },
        update: {},
        create: {
          name: lead.name, phone: lead.phone, whatsapp: lead.whatsapp, email,
          address: lead.address || 'Address to be confirmed', notes: `Converted from ${lead.source} lead`,
          portalCode: crypto.randomBytes(6).toString('hex').toUpperCase(),
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
      const items = parseLineItems(lines);
      const issueDate = body.issueDate == null ? new Date().toISOString().slice(0, 10) : isoDate(body.issueDate);
      const validUntil = body.validUntil == null ? isoDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)) : isoDate(body.validUntil);
      const totals = items && calculateTotals(items, body.taxRate ?? 15.5, body.discount ?? 0);
      if (!items || !issueDate || !validUntil || !totals) throw new Error('INVALID_QUOTE_DATA');
      const itemIds = [...new Set(items.flatMap((item) => item.itemId ? [item.itemId] : []))];
      const pricebookIds = [...new Set(items.flatMap((item) => item.pricebookItemId ? [item.pricebookItemId] : []))];
      const [inventoryCount, pricebookCount] = await Promise.all([
        itemIds.length ? tx.inventoryItem.count({ where: { id: { in: itemIds } } }) : 0,
        pricebookIds.length ? tx.pricebookItem.count({ where: { id: { in: pricebookIds } } }) : 0,
      ]);
      if (inventoryCount !== itemIds.length || pricebookCount !== pricebookIds.length) throw new Error('INVALID_QUOTE_ITEM');
      const quote = await tx.quote.create({
        data: {
          quoteRef: makeReference('QUO'), customerId: customer.id, leadId: id,
          issueDate, validUntil,
          tier: ['basic', 'standard', 'premium', 'custom'].includes(body.tier) ? body.tier : 'standard',
          subtotal: totals.subtotal, discount: totals.discount, taxRate: totals.taxRate, tax: totals.tax, total: totals.total,
          terms: cleanText(body.terms) || 'Quotation valid until the date shown. Parts availability is subject to confirmation.',
          notes: cleanText(body.notes) || null,
          lineItems: { create: items },
        },
        include: { lineItems: true, customer: true },
      });
      await tx.lead.update({ where: { id }, data: { status: 'quoted' } });
      return { customer, quote };
    }
    const validTypes = new Set(['installation', 'maintenance', 'repair', 'sales', 'inspection', 'callout']);
    const validUnits = new Set(['Split_System', 'Ducted', 'Package_Unit', 'Multi_Head', 'Cassette', 'VRV_VRF', 'Refrigeration_System', 'Chiller', 'Heat_Pump', 'Precision_Cooling']);
    const validIssues = new Set(['install', 'repair', 'service', 'quote']);
    const validPriorities = new Set(['emergency', 'urgent', 'high', 'normal', 'medium', 'low']);
    const jobDate = isoDate(body.date) || new Date().toISOString().slice(0, 10);
    const jobTime = /^\d{2}:\d{2}$/.test(String(body.time || '')) ? String(body.time) : '08:00';
    const jobType = validTypes.has(body.type) ? body.type : 'repair';
    const unitType = validUnits.has(body.unitType) ? body.unitType : 'Split_System';
    const issue = validIssues.has(body.issue) ? body.issue : 'repair';
    const priority = validPriorities.has(lead.priority) ? lead.priority : 'normal';
    const siteId = cleanText(body.siteId, 100) || null;
    const equipmentId = cleanText(body.equipmentId, 100) || null;
    if (siteId) {
      const site = await tx.serviceSite.findFirst({ where: { id: siteId, customerId: customer.id }, select: { id: true } });
      if (!site) throw new Error('INVALID_JOB_SITE');
    }
    if (equipmentId) {
      const equipment = await tx.equipment.findFirst({ where: { id: equipmentId, customerId: customer.id, ...(siteId ? { siteId } : {}) }, select: { id: true } });
      if (!equipment) throw new Error('INVALID_JOB_EQUIPMENT');
    }
    const requestedTechIds = Array.isArray(body.techIds) ? body.techIds.filter((techId: unknown): techId is string => typeof techId === 'string') : [];
    if (Array.isArray(body.techIds) && requestedTechIds.length !== body.techIds.length) throw new Error('INVALID_JOB_TECHS');
    if (requestedTechIds.length) {
      const techCount = await tx.user.count({ where: { id: { in: requestedTechIds }, role: 'tech' } });
      if (techCount !== new Set(requestedTechIds).size) throw new Error('INVALID_JOB_TECHS');
    }
    const job = await tx.job.create({
      data: {
        source: 'admin', customerId: customer.id, leadId: id,
        siteId, equipmentId,
        title: cleanText(body.title, 200) || lead.serviceType || 'HVAC service enquiry',
        type: jobType as JobType, unitType: unitType as UnitType,
        issue, priority,
        date: jobDate, time: jobTime,
        durationMinutes: Math.max(30, Number(body.durationMinutes || 120)), status: 'scheduled',
        description: lead.description, photos: [], alerts: [], jobCardRef: makeReference('JOB'),
        technicians: requestedTechIds.length ? { connect: requestedTechIds.map((techId: string) => ({ id: techId })) } : undefined,
      },
      include: { customer: true, technicians: true },
    });
    await tx.lead.update({ where: { id }, data: { status: 'booked' } });
    return { customer, job };
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'INVALID_QUOTE_DATA') return NextResponse.json({ error: 'Invalid quote dates, line items, tax, or discount' }, { status: 400 });
    if (code === 'INVALID_QUOTE_ITEM') return NextResponse.json({ error: 'A quote line references an unknown catalogue item' }, { status: 400 });
    if (code === 'INVALID_JOB_SITE') return NextResponse.json({ error: 'Site does not belong to the converted customer' }, { status: 400 });
    if (code === 'INVALID_JOB_EQUIPMENT') return NextResponse.json({ error: 'Equipment does not belong to the selected customer site' }, { status: 400 });
    if (code === 'INVALID_JOB_TECHS') return NextResponse.json({ error: 'All assigned users must be technician accounts' }, { status: 400 });
    throw error;
  }

  await auditServiceAction(session!, 'convert_lead', `Converted lead ${id} to ${mode}`, 'job' in result ? result.job?.id : null);
  const canViewPortalCode = ['owner', 'admin'].includes(session!.user.role);
  const safeResult = {
    ...result,
    customer: redactPortalCode(result.customer, canViewPortalCode),
    ...('quote' in result && result.quote ? { quote: { ...result.quote, customer: redactPortalCode(result.quote.customer, canViewPortalCode) } } : {}),
    ...('job' in result && result.job ? { job: { ...result.job, customer: redactPortalCode(result.job.customer, canViewPortalCode) } } : {}),
  };
  return NextResponse.json(safeResult, { status: 201 });
}
