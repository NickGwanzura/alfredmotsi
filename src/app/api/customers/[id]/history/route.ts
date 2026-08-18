import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FIELD_ROLES, FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import { redactPortalCode } from '@/app/lib/customerTransform';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...FIELD_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES, 'sales']);
  if (error) return error;
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sites: { include: { equipment: true, _count: { select: { jobs: true, contracts: true } } }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      jobs: { include: { site: true, equipment: true, technicians: { select: { id: true, name: true } }, diagnostics: true, comments: true, partUsages: { include: { item: { select: { name: true, sku: true } } } } }, orderBy: { createdAt: 'desc' } },
      quotes: { include: { lineItems: true }, orderBy: { createdAt: 'desc' } },
      invoices: { include: { lineItems: true, payments: true }, orderBy: { createdAt: 'desc' } },
      payments: { include: { invoice: { select: { invoiceRef: true } } }, orderBy: { receivedAt: 'desc' } },
      contracts: { include: { site: true, equipment: { include: { equipment: true } } }, orderBy: { createdAt: 'desc' } },
      crmRecords: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  if (!(FINANCE_ROLES as readonly string[]).includes(String(session!.user.role))) {
    const safeContracts = customer.contracts.map((contract) => {
      const copy: Partial<typeof contract> = { ...contract };
      delete copy.agreedAmount;
      return copy;
    });
    return NextResponse.json(redactPortalCode({ ...customer, quotes: [], invoices: [], payments: [], contracts: safeContracts }, false));
  }
  return NextResponse.json(redactPortalCode(customer, true));
}
