import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

async function checkAuth(): Promise<boolean> {
  const session = await auth();
  return !!session?.user && session.user.role === 'admin';
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true, job: { select: { jobCardRef: true, title: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  if (body.status === 'paid' && !body.paidAt) {
    body.paidAt = new Date().toISOString();
  }
  const invoice = await prisma.invoice.update({
    where: { id },
    data: body,
    include: { customer: true, lineItems: true, job: { select: { id: true, jobCardRef: true, title: true } } },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
