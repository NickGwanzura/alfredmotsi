import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { ContractStatus } from '@prisma/client';
import { auditServiceAction, cleanText, FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

const statuses = new Set(['active', 'expiring_soon', 'expired', 'cancelled']);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const status = body.status ? String(body.status).replace('-', '_') : undefined;
  if (status && !statuses.has(status)) return NextResponse.json({ error: 'Invalid contract status' }, { status: 400 });
  const contract = await prisma.maintenanceContract.update({ where: { id }, data: { ...(status && { status: status as ContractStatus }), ...(body.nextServiceDate !== undefined && { nextServiceDate: cleanText(body.nextServiceDate, 10) }), ...(body.endDate !== undefined && { endDate: cleanText(body.endDate, 10) }), ...(body.notes !== undefined && { notes: cleanText(body.notes) || null }), ...(body.autoCreateJobs !== undefined && { autoCreateJobs: Boolean(body.autoCreateJobs) }) }, include: { customer: true, site: true, equipment: { include: { equipment: true } } } });
  await auditServiceAction(session!, 'update_contract', `Updated contract ${contract.contractRef}`);
  return NextResponse.json(contract);
}
