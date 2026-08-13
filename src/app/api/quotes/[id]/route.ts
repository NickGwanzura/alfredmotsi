import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
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
  const quote = await prisma.quote.update({ where: { id }, data: { ...body, ...(body.status === 'viewed' && { viewedAt: new Date() }), ...(body.status === 'accepted' && { acceptedAt: new Date() }) }, include: { customer: true } });
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
