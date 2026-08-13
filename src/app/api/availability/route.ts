import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { cleanText, FIELD_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(request: NextRequest) {
  const { error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const date = request.nextUrl.searchParams.get('date');
  const userId = request.nextUrl.searchParams.get('userId');
  return NextResponse.json(await prisma.technicianAvailability.findMany({ where: { ...(date && { date }), ...(userId && { userId }) }, include: { user: { select: { id: true, name: true } } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] }));
}

export async function POST(request: NextRequest) {
  const { error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const body = await request.json();
  const date = cleanText(body.date, 10), startTime = cleanText(body.startTime, 5), endTime = cleanText(body.endTime, 5);
  if (!body.userId || !date || !startTime || !endTime || startTime >= endTime) return NextResponse.json({ error: 'Technician, date, and valid time range required' }, { status: 400 });
  return NextResponse.json(await prisma.technicianAvailability.upsert({ where: { userId_date_startTime_endTime: { userId: body.userId, date, startTime, endTime } }, update: { available: body.available !== false, notes: cleanText(body.notes, 500) || null }, create: { userId: body.userId, date, startTime, endTime, available: body.available !== false, notes: cleanText(body.notes, 500) || null } }), { status: 201 });
}
