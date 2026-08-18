import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // The customer ID is stored as the user ID for portal sessions
  const customer = await prisma.customer.findFirst({
    where: { email: session.user.email! },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const jobs = await prisma.job.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    select: {
      id: true, title: true, type: true, status: true, date: true, time: true,
      jobCardRef: true, priority: true, description: true,
      technicians: { select: { name: true, phone: true } },
    },
  });

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    select: { id: true, invoiceRef: true, status: true, total: true, issueDate: true, dueDate: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ customer: { name: customer.name, email: customer.email }, jobs, invoices });
}
