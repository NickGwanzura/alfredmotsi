import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, cleanText, FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import { emitServiceNotification } from '@/app/lib/notifications/provider';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = authorizeRole(session, [...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (forbidden) return forbidden;
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  const validStatuses = new Set(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'declined', 'expired']);
  const validTiers = new Set(['basic', 'standard', 'premium', 'custom']);
  if (body.status !== undefined && !validStatuses.has(body.status)) return NextResponse.json({ error: 'Invalid quote status' }, { status: 400 });
  if (body.tier !== undefined && !validTiers.has(body.tier)) return NextResponse.json({ error: 'Invalid quote tier' }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === 'viewed') data.viewedAt = new Date();
    if (body.status === 'accepted') data.acceptedAt = new Date();
  }
  if (body.tier !== undefined) data.tier = body.tier;
  if (body.validUntil !== undefined) data.validUntil = cleanText(body.validUntil, 10);
  if (body.terms !== undefined) data.terms = cleanText(body.terms, 10000) || null;
  if (body.notes !== undefined) data.notes = cleanText(body.notes, 5000) || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: 'No editable quote fields supplied' }, { status: 400 });
  const quote = await prisma.quote.update({ where: { id }, data, include: { customer: true } });
  if (body.status === 'sent') {
    await auditServiceAction(session!, 'send_quote', `Marked quote ${quote.quoteRef} as sent`, quote.jobId);
    await emitServiceNotification({ event: 'quote.sent', channel: 'email', recipient: quote.customer.email, customerId: quote.customerId, jobId: quote.jobId || undefined, referenceId: quote.id, payload: { quoteRef: quote.quoteRef, total: quote.total } });
  } else if (body.status === 'rejected' || body.status === 'declined') {
    await auditServiceAction(session!, 'reject_quote', `Quote ${quote.quoteRef} rejected`, quote.jobId);
  }
  return NextResponse.json(quote);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !['owner', 'admin'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
