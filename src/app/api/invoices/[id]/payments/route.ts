import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { PaymentMethod } from '@prisma/client';
import { auditServiceAction, FINANCE_ROLES, makeReference, positiveNumber, serviceSession } from '@/app/lib/serviceAuth';
import { emitServiceNotification } from '@/app/lib/notifications/provider';

const METHODS = new Set(['cash', 'bank_transfer', 'ecocash', 'card', 'velocity', 'other']);

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await params;
  return NextResponse.json(await prisma.payment.findMany({ where: { invoiceId: id }, orderBy: { receivedAt: 'desc' } }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const amount = positiveNumber(body.amount);
  const method = String(body.method || '').replace('-', '_');
  if (amount === null || !METHODS.has(method)) return NextResponse.json({ error: 'Positive amount and valid payment method required' }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id }, include: { customer: true } });
      if (!invoice) throw new Error('NOT_FOUND');
      const currentBalance = invoice.balance;
      if (currentBalance <= 0.001) throw new Error('ALREADY_PAID');
      if (amount > currentBalance + 0.001) throw new Error('OVERPAYMENT');
      const balance = Math.max(0, currentBalance - amount);
      const payment = await tx.payment.create({
        data: { invoiceId: id, customerId: invoice.customerId, amount, method: method as PaymentMethod, reference: typeof body.reference === 'string' ? body.reference.trim().slice(0, 200) : null, notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null, recordedBy: session!.user.id, receiptRef: makeReference('RCT') },
      });
      const updatedInvoice = await tx.invoice.update({ where: { id }, data: { balance, status: balance <= 0.001 ? 'paid' : 'partial', paidAt: balance <= 0.001 ? new Date() : null, paidRef: balance <= 0.001 ? payment.receiptRef : null }, include: { payments: true, customer: true, lineItems: true } });
      return { payment, invoice: updatedInvoice };
    });
    await auditServiceAction(session!, 'record_payment', `Recorded ${amount} against invoice ${id}`);
    await emitServiceNotification({ event: 'payment.received', channel: 'email', recipient: result.invoice.customer.email, customerId: result.invoice.customerId, referenceId: result.payment.id, payload: { invoiceRef: result.invoice.invoiceRef, receiptRef: result.payment.receiptRef, amount, balance: result.invoice.balance } });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'OVERPAYMENT') return NextResponse.json({ error: 'Payment exceeds outstanding balance' }, { status: 409 });
    if (error instanceof Error && error.message === 'ALREADY_PAID') return NextResponse.json({ error: 'Invoice has no outstanding balance' }, { status: 409 });
    throw error;
  }
}
