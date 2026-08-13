import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { JobPriority, LeadSource, LeadStatus } from '@prisma/client';
import { auditServiceAction, cleanText, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

const SOURCES = new Set(['phone', 'whatsapp', 'website', 'referral', 'facebook', 'google', 'walk_in', 'repeat', 'other']);
const PRIORITIES = new Set(['emergency', 'urgent', 'high', 'normal', 'medium', 'low']);

export async function GET(request: NextRequest) {
  const { error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const status = request.nextUrl.searchParams.get('status');
  const leads = await prisma.lead.findMany({
    where: status ? { status: status.replace('-', '_') as LeadStatus } : undefined,
    include: { customer: { select: { id: true, name: true } }, quotes: { select: { id: true, quoteRef: true, status: true, total: true } }, job: { select: { id: true, jobCardRef: true, status: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const body = await request.json();
  const name = cleanText(body.name, 160);
  const phone = cleanText(body.phone, 40);
  const description = cleanText(body.description);
  const source = String(body.source || '').replace('-', '_');
  const priority = String(body.priority || 'normal');
  if (!name || !phone || !description || !SOURCES.has(source) || !PRIORITIES.has(priority)) {
    return NextResponse.json({ error: 'Name, phone, description, valid source and priority are required' }, { status: 400 });
  }
  const lead = await prisma.lead.create({
    data: {
      customerId: cleanText(body.customerId, 100) || null,
      name,
      phone,
      whatsapp: cleanText(body.whatsapp, 40) || null,
      email: cleanText(body.email, 200).toLowerCase() || null,
      address: cleanText(body.address, 500) || null,
      source: source as LeadSource,
      priority: priority as JobPriority,
      serviceType: cleanText(body.serviceType, 120) || null,
      description,
      nextFollowUp: cleanText(body.nextFollowUp, 10) || null,
    },
  });
  if (lead.nextFollowUp) {
    await prisma.reminder.create({
      data: { type: 'inactive_lead', leadId: lead.id, customerId: lead.customerId, title: `Follow up ${lead.name}`, dueAt: new Date(`${lead.nextFollowUp}T09:00:00`) },
    });
  }
  await auditServiceAction(session!, 'create_lead', `Created ${source} lead for ${name}`);
  return NextResponse.json(lead, { status: 201 });
}
