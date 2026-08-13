import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { BillingCycle, ContractStatus } from '@prisma/client';
import { auditServiceAction, cleanText, FINANCE_ROLES, makeReference, OPERATIONS_ROLES, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';

function derivedStatus(endDate: string, current: ContractStatus): ContractStatus {
  if (current === 'cancelled') return current;
  const days = Math.ceil((new Date(`${endDate}T23:59:59`).getTime() - Date.now()) / 86400000);
  return days < 0 ? 'expired' : days <= 45 ? 'expiring_soon' : 'active';
}

export async function GET() {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES, 'tech']);
  if (error) return error;
  const contracts = await prisma.maintenanceContract.findMany({
    include: { customer: { select: { id: true, name: true, phone: true } }, site: true, equipment: { include: { equipment: true } } },
    orderBy: { nextServiceDate: 'asc' },
  });
  return NextResponse.json(contracts.map((contract) => ({ ...contract, status: derivedStatus(contract.endDate, contract.status) })));
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const body = await request.json();
  const amount = positiveNumber(body.agreedAmount);
  const frequency = positiveNumber(body.visitFrequencyMonths);
  if (!body.customerId || !body.siteId || !body.startDate || !body.endDate || !body.nextServiceDate || amount === null || frequency === null) {
    return NextResponse.json({ error: 'Customer, site, dates, frequency, and agreed amount are required' }, { status: 400 });
  }
  const site = await prisma.serviceSite.findUnique({ where: { id: body.siteId }, select: { customerId: true } });
  if (!site || site.customerId !== body.customerId) return NextResponse.json({ error: 'Site does not belong to customer' }, { status: 400 });
  const contract = await prisma.maintenanceContract.create({
    data: {
      contractRef: makeReference('MNT'), customerId: body.customerId, siteId: body.siteId,
      startDate: cleanText(body.startDate, 10), endDate: cleanText(body.endDate, 10),
      billingCycle: (body.billingCycle || 'annual') as BillingCycle, visitFrequencyMonths: Math.round(frequency), agreedAmount: amount,
      nextServiceDate: cleanText(body.nextServiceDate, 10), notes: cleanText(body.notes) || null, autoCreateJobs: Boolean(body.autoCreateJobs),
      equipment: Array.isArray(body.equipmentIds) ? { create: body.equipmentIds.map((equipmentId: string) => ({ equipmentId })) } : undefined,
    },
    include: { customer: true, site: true, equipment: { include: { equipment: true } } },
  });
  await prisma.reminder.create({ data: { type: 'maintenance_due', customerId: body.customerId, title: `Maintenance due - ${contract.contractRef}`, dueAt: new Date(`${contract.nextServiceDate}T08:00:00`), referenceType: 'contract', referenceId: contract.id } });
  await auditServiceAction(session!, 'create_contract', `Created maintenance contract ${contract.contractRef}`);
  return NextResponse.json(contract, { status: 201 });
}
