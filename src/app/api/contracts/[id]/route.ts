import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { ContractStatus } from '@prisma/client';
import { auditServiceAction, cleanText, FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import { isoDate } from '@/app/lib/financial';
import { canViewFinancials } from '@/app/lib/permissions';

const statuses = new Set(['active', 'expiring_soon', 'expired', 'cancelled']);

function redactContract<T extends { agreedAmount?: unknown; billingCycle?: unknown }>(contract: T, role: string): Omit<T, 'agreedAmount' | 'billingCycle'> | T {
  if (canViewFinancials(role)) return contract;
  const safeContract = { ...contract };
  delete safeContract.agreedAmount;
  delete safeContract.billingCycle;
  return safeContract;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.maintenanceContract.findUnique({ where: { id }, select: { startDate: true, endDate: true, nextServiceDate: true } });
  if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  const status = body.status ? String(body.status).replace('-', '_') : undefined;
  if (status && !statuses.has(status)) return NextResponse.json({ error: 'Invalid contract status' }, { status: 400 });
  const nextServiceDate = body.nextServiceDate === undefined ? existing.nextServiceDate : isoDate(body.nextServiceDate);
  const endDate = body.endDate === undefined ? existing.endDate : isoDate(body.endDate);
  if (!nextServiceDate || !endDate || existing.startDate > endDate) return NextResponse.json({ error: 'Contract dates must be valid ISO dates and end date cannot precede start date' }, { status: 400 });
  if (body.autoCreateJobs !== undefined && typeof body.autoCreateJobs !== 'boolean') return NextResponse.json({ error: 'autoCreateJobs must be boolean' }, { status: 400 });
  const contract = await prisma.maintenanceContract.update({ where: { id }, data: { ...(status && { status: status as ContractStatus }), ...(body.nextServiceDate !== undefined && { nextServiceDate }), ...(body.endDate !== undefined && { endDate }), ...(body.notes !== undefined && { notes: cleanText(body.notes) || null }), ...(body.autoCreateJobs !== undefined && { autoCreateJobs: body.autoCreateJobs }) }, include: { customer: true, site: true, equipment: { include: { equipment: true } } } });
  await auditServiceAction(session!, 'update_contract', `Updated contract ${contract.contractRef}`);
  return NextResponse.json(redactContract(contract, session!.user.role));
}
