import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { BillingCycle, ContractStatus } from '@prisma/client';
import { auditServiceAction, cleanText, FINANCE_ROLES, makeReference, OPERATIONS_ROLES, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';
import { isoDate } from '@/app/lib/financial';
import { canViewFinancials } from '@/app/lib/permissions';

function redactContract<T extends { agreedAmount?: unknown; billingCycle?: unknown }>(contract: T, role: string): Omit<T, 'agreedAmount' | 'billingCycle'> | T {
  if (canViewFinancials(role)) return contract;
  const safeContract = { ...contract };
  delete safeContract.agreedAmount;
  delete safeContract.billingCycle;
  return safeContract;
}

function derivedStatus(endDate: string, current: ContractStatus): ContractStatus {
  if (current === 'cancelled') return current;
  const days = Math.ceil((new Date(`${endDate}T23:59:59`).getTime() - Date.now()) / 86400000);
  return days < 0 ? 'expired' : days <= 45 ? 'expiring_soon' : 'active';
}

export async function GET() {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES, 'tech']);
  if (error) return error;
  const contracts = await prisma.maintenanceContract.findMany({
    include: { customer: { select: { id: true, name: true, phone: true } }, site: true, equipment: { include: { equipment: true } } },
    orderBy: { nextServiceDate: 'asc' },
    take: 500,
  });
  return NextResponse.json(contracts.map((contract) => redactContract({ ...contract, status: derivedStatus(contract.endDate, contract.status) }, session!.user.role)));
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const body = await request.json();
  const amount = positiveNumber(body.agreedAmount);
  const frequency = positiveNumber(body.visitFrequencyMonths);
  const startDate = isoDate(body.startDate);
  const endDate = isoDate(body.endDate);
  const nextServiceDate = isoDate(body.nextServiceDate);
  const billingCycles = new Set(['monthly', 'quarterly', 'biannual', 'annual']);
  if (!body.customerId || !body.siteId || !startDate || !endDate || !nextServiceDate || startDate > endDate || amount === null || frequency === null || !billingCycles.has(body.billingCycle || 'annual')) {
    return NextResponse.json({ error: 'Customer, site, dates, frequency, and agreed amount are required' }, { status: 400 });
  }
  const site = await prisma.serviceSite.findUnique({ where: { id: body.siteId }, select: { customerId: true } });
  if (!site || site.customerId !== body.customerId) return NextResponse.json({ error: 'Site does not belong to customer' }, { status: 400 });
  const rawEquipmentIds: unknown[] = Array.isArray(body.equipmentIds) ? body.equipmentIds : [];
  const equipmentIds: string[] = [...new Set(rawEquipmentIds.filter((id): id is string => typeof id === 'string'))];
  if (Array.isArray(body.equipmentIds) && equipmentIds.length !== rawEquipmentIds.length) return NextResponse.json({ error: 'Invalid equipment ids' }, { status: 400 });
  if (equipmentIds.length) {
    const equipmentCount = await prisma.equipment.count({ where: { id: { in: equipmentIds }, customerId: body.customerId, siteId: body.siteId } });
    if (equipmentCount !== equipmentIds.length) return NextResponse.json({ error: 'Equipment must belong to the selected customer site' }, { status: 400 });
  }
  const contract = await prisma.maintenanceContract.create({
    data: {
      contractRef: makeReference('MNT'), customerId: body.customerId, siteId: body.siteId,
      startDate, endDate,
      billingCycle: (body.billingCycle || 'annual') as BillingCycle, visitFrequencyMonths: Math.round(frequency), agreedAmount: amount,
      nextServiceDate, notes: cleanText(body.notes) || null, autoCreateJobs: Boolean(body.autoCreateJobs),
      equipment: equipmentIds.length ? { create: equipmentIds.map((equipmentId: string) => ({ equipmentId })) } : undefined,
    },
    include: { customer: true, site: true, equipment: { include: { equipment: true } } },
  });
  await prisma.reminder.create({ data: { type: 'maintenance_due', customerId: body.customerId, title: `Maintenance due - ${contract.contractRef}`, dueAt: new Date(`${contract.nextServiceDate}T08:00:00`), referenceType: 'contract', referenceId: contract.id } });
  await auditServiceAction(session!, 'create_contract', `Created maintenance contract ${contract.contractRef}`);
  return NextResponse.json(redactContract(contract, session!.user.role), { status: 201 });
}
