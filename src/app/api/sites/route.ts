import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, cleanText, FIELD_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(request: NextRequest) {
  const { session, error } = await serviceSession([...FIELD_ROLES, 'sales']);
  if (error) return error;
  const customerId = request.nextUrl.searchParams.get('customerId');
  const isTech = session!.user.role === 'tech';
  const sites = await prisma.serviceSite.findMany({
    where: { ...(customerId && { customerId }), ...(isTech ? { jobs: { some: { OR: [{ technicians: { some: { id: session!.user.id } } }, { coTechnicians: { some: { id: session!.user.id } } }] } } } : {}) },
    include: {
      equipment: { orderBy: { createdAt: 'desc' } },
      _count: { select: { jobs: true, contracts: true } },
    },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    take: 500,
  });
  return NextResponse.json(sites);
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const body = await request.json();
  const customerId = cleanText(body.customerId, 100);
  const name = cleanText(body.name, 120);
  const address = cleanText(body.address, 500);
  if (!customerId || !name || !address) {
    return NextResponse.json({ error: 'Customer, site name, and address are required' }, { status: 400 });
  }
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const site = await prisma.$transaction(async (tx) => {
    if (body.isPrimary) await tx.serviceSite.updateMany({ where: { customerId }, data: { isPrimary: false } });
    return tx.serviceSite.create({
      data: {
        customerId,
        name,
        address,
        contactName: cleanText(body.contactName, 120) || null,
        phone: cleanText(body.phone, 40) || null,
        accessNotes: cleanText(body.accessNotes) || null,
        isPrimary: Boolean(body.isPrimary),
      },
      include: { equipment: true, _count: { select: { jobs: true, contracts: true } } },
    });
  });
  await auditServiceAction(session!, 'create_site', `Created site ${site.name} for customer ${customerId}`);
  return NextResponse.json(site, { status: 201 });
}
