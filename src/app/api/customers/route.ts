import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import crypto from 'node:crypto';
import { redactPortalCode } from '@/app/lib/customerTransform';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and technicians may view the full customer list.
    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const canViewPortalCode = ['owner', 'admin'].includes(session.user.role);
    return NextResponse.json(customers.map((customer) => redactPortalCode(customer, canViewPortalCode)));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { name, address, siteAddress, phone, whatsapp, notes } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!name || !address || !phone || !email) {
      return NextResponse.json(
        { error: 'Name, address, phone, and email are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A customer with this email already exists' },
        { status: 409 }
      );
    }

   const portalCode = crypto.randomBytes(6).toString('hex').toUpperCase();

   const user = session.user as { id: string; name?: string | null };
   const customer = await prisma.customer.create({
     data: {
       name,
       address,
       siteAddress: siteAddress || null,
       phone,
       whatsapp: whatsapp || null,
       email,
       notes: typeof notes === 'string' ? notes.trim().slice(0, 5000) || null : null,
       portalCode,
       portalEnabled: false,
     },
   });

   await prisma.auditLog.create({
     data: {
       userId: user.id,
       userName: user.name || 'Unknown',
       action: 'create_customer',
       jobId: null,
       reason: `Customer created: ${name} (${email})`,
       ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') || null,
       userAgent: request.headers.get('user-agent') || null,
     },
   }).catch(() => {});

   return NextResponse.json(redactPortalCode(customer, ['owner', 'admin'].includes(session.user.role)), { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
