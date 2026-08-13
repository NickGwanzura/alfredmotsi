import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { LeadStatus } from '@prisma/client';
import { auditServiceAction, cleanText, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

const STATUSES = new Set(['new', 'contacted', 'quoted', 'booked', 'in_progress', 'won', 'lost']);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const status = body.status ? String(body.status).replace('-', '_') : undefined;
  if (status && !STATUSES.has(status)) return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 });
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(status && { status: status as LeadStatus }),
      ...(body.nextFollowUp !== undefined && { nextFollowUp: cleanText(body.nextFollowUp, 10) || null }),
      ...(body.lostReason !== undefined && { lostReason: cleanText(body.lostReason, 500) || null }),
      ...(body.description !== undefined && { description: cleanText(body.description) }),
    },
  });
  await auditServiceAction(session!, 'update_lead', `Updated lead ${id} to ${lead.status}`);
  return NextResponse.json(lead);
}
