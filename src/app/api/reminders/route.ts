import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { OPERATIONS_ROLES, FINANCE_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(request: NextRequest) {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const includeCompleted = request.nextUrl.searchParams.get('completed') === 'true';
  const reminders = await prisma.reminder.findMany({ where: includeCompleted ? undefined : { completed: false }, include: { customer: { select: { id: true, name: true } }, lead: { select: { id: true, name: true, status: true } } }, orderBy: { dueAt: 'asc' }, take: 500 });
  return NextResponse.json(reminders);
}

export async function PATCH(request: NextRequest) {
  const { error } = await serviceSession([...OPERATIONS_ROLES, ...FINANCE_ROLES]);
  if (error) return error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'Reminder id required' }, { status: 400 });
  return NextResponse.json(await prisma.reminder.update({ where: { id: body.id }, data: { completed: Boolean(body.completed) } }));
}
