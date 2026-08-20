import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import { canViewFinancials } from '@/app/lib/permissions';

export async function GET() {
  const { session, error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const canSeeFinancials = canViewFinancials(session!.user.role as string);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const soon = new Date(now.getTime() + 45 * 86400000).toISOString().slice(0, 10);

  const [jobs, invoices, quotes, lowStock, contracts, techs, payments] = await Promise.all([
    prisma.job.findMany({ where: { OR: [{ date: { gte: monthStart } }, { status: { notIn: ['completed', 'cancelled'] } }] }, include: { technicians: { select: { id: true, name: true } } } }),
    prisma.invoice.findMany({ where: { OR: [{ issueDate: { gte: monthStart } }, { status: { in: ['sent', 'partial', 'overdue'] } }] }, select: { total: true, balance: true, status: true, issueDate: true, job: { select: { type: true } } } }),
    prisma.quote.findMany({ where: { issueDate: { gte: monthStart } }, select: { status: true, total: true } }),
    prisma.inventoryItem.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, stockLevel: true, reorderLevel: true } }),
    prisma.maintenanceContract.findMany({ where: { status: { not: 'cancelled' }, endDate: { lte: soon } }, include: { customer: { select: { name: true } }, site: { select: { name: true } } }, orderBy: { endDate: 'asc' } }),
    prisma.user.findMany({ where: { role: 'tech' }, select: { id: true, name: true } }),
    prisma.payment.aggregate({ where: { receivedAt: { gte: new Date(`${monthStart}T00:00:00`) } }, _sum: { amount: true } }),
  ]);

  const statusCounts = jobs.reduce<Record<string, number>>((acc, job) => { acc[job.status] = (acc[job.status] || 0) + 1; return acc; }, {});
  const techPerformance = techs.map((tech) => {
    const assigned = jobs.filter((job) => job.technicians.some((item) => item.id === tech.id));
    const completed = assigned.filter((job) => job.status === 'completed').length;
    return { id: tech.id, name: tech.name, assigned: assigned.length, completed, completionRate: assigned.length ? Math.round(completed / assigned.length * 100) : 0 };
  });
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted').length;
  const revenueByServiceType = invoices.filter((invoice) => invoice.issueDate >= monthStart).reduce<Record<string, number>>((acc, invoice) => {
    const type = invoice.job?.type || 'unlinked';
    acc[type] = (acc[type] || 0) + invoice.total;
    return acc;
  }, {});
  const safeExpiringContracts = contracts.map((contract) => {
    if (canSeeFinancials) return contract;
    const { agreedAmount, billingCycle, ...safeContract } = contract;
    void agreedAmount;
    void billingCycle;
    return safeContract;
  });

  return NextResponse.json({
    todayScheduled: jobs.filter((job) => job.date === today && !['completed', 'cancelled'].includes(job.status)).length,
    openJobs: jobs.filter((job) => !['completed', 'cancelled'].includes(job.status)).length,
    emergencyJobs: jobs.filter((job) => job.priority === 'emergency' && !['completed', 'cancelled'].includes(job.status)).length,
    completedThisMonth: jobs.filter((job) => job.status === 'completed' && job.date >= monthStart).length,
    quoteConversionRate: quotes.length ? Math.round(acceptedQuotes / quotes.length * 100) : 0,
    jobsByStatus: statusCounts,
    jobsByServiceType: jobs.reduce<Record<string, number>>((acc, job) => { acc[job.type] = (acc[job.type] || 0) + 1; return acc; }, {}),
    technicianPerformance: techPerformance,
    lowStock: lowStock.filter((item) => item.stockLevel <= item.reorderLevel),
    expiringContracts: safeExpiringContracts,
    ...(canSeeFinancials ? {
      revenueThisMonth: payments._sum.amount || 0,
      outstandingInvoices: invoices.reduce((sum, invoice) => sum + (invoice.status === 'paid' ? 0 : invoice.balance || invoice.total), 0),
      revenueByServiceType,
    } : {}),
  });
}
