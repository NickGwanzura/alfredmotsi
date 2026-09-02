import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { getCustomerDisplayName, redactPortalCode } from '@/app/lib/customerTransform';

type RouteContext = { params: Promise<{ id: string }> };

function auditIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null;
}

async function writeAudit(request: NextRequest, session: { user: { id: string; name?: string | null } }, action: 'update_customer' | 'delete_customer', reason: string) {
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userName: session.user.name || 'Unknown',
      action,
      jobId: null,
      reason,
      ipAddress: auditIp(request),
      userAgent: request.headers.get('user-agent') || null,
    },
  }).catch((error) => console.error(`Failed to write ${action} audit log:`, error));
}

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const existing = await prisma.customer.findFirst({ where: { id, archivedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'A valid JSON customer payload is required' }, { status: 400 });
    const raw = body as Record<string, unknown>;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const address = typeof raw.address === 'string' ? raw.address.trim() : '';
    const siteAddress = typeof raw.siteAddress === 'string' ? raw.siteAddress.trim() : '';
    const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
    const whatsapp = typeof raw.whatsapp === 'string' ? raw.whatsapp.trim() : '';
    const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';

    if (!name || !address || !phone || !email) return NextResponse.json({ error: 'Name, address, phone, and email are required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    if (name.length > 200 || address.length > 500 || siteAddress.length > 500 || phone.length > 50 || whatsapp.length > 50 || email.length > 320 || notes.length > 5000) {
      return NextResponse.json({ error: 'One or more customer fields exceed the allowed length' }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { name, address, siteAddress: siteAddress || null, phone, whatsapp: whatsapp || null, email, notes: notes || null },
    });
    await writeAudit(request, session, 'update_customer', `Customer updated: ${name} (${email})`);
    return NextResponse.json(redactPortalCode({ ...customer, name: getCustomerDisplayName(customer) }, ['owner', 'admin'].includes(session.user.role)));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 });
    }
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const forbidden = authorizeRole(session, ['owner', 'admin']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const existing = await prisma.customer.findFirst({ where: { id, archivedAt: null }, select: { id: true, name: true, email: true } });
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const customer = await prisma.customer.update({
      where: { id },
      data: { archivedAt: new Date(), portalEnabled: false },
      select: { id: true, archivedAt: true },
    });
    await writeAudit(request, session, 'delete_customer', `Customer archived: ${existing.name} (${existing.email})`);
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Error archiving customer:', error);
    return NextResponse.json({ error: 'Failed to archive customer' }, { status: 500 });
  }
}
