import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { ChecklistResult } from '@prisma/client';
import { auditServiceAction, FIELD_ROLES, serviceSession } from '@/app/lib/serviceAuth';

async function canAccessJob(userId: string, role: string, jobId: string) {
  if (['owner', 'admin', 'dispatcher'].includes(role)) return true;
  return Boolean(await prisma.job.findFirst({ where: { id: jobId, OR: [{ technicians: { some: { id: userId } } }, { coTechnicians: { some: { id: userId } } }] }, select: { id: true } }));
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const { id } = await params;
  if (!await canAccessJob(session!.user.id!, session!.user.role as string, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.jobChecklist.findMany({ where: { jobId: id }, include: { template: { include: { items: { orderBy: { sortOrder: 'asc' } } } }, responses: true } }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const { id } = await params;
  if (!await canAccessJob(session!.user.id!, session!.user.role as string, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  if (!body.templateId) return NextResponse.json({ error: 'Template id required' }, { status: 400 });
  const template = await prisma.checklistTemplate.findUnique({ where: { id: body.templateId }, include: { items: true } });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  const checklist = await prisma.jobChecklist.upsert({
    where: { jobId_templateId: { jobId: id, templateId: body.templateId } }, update: {},
    create: { jobId: id, templateId: body.templateId, responses: { create: template.items.map((item) => ({ templateItemId: item.id })) } },
    include: { template: { include: { items: { orderBy: { sortOrder: 'asc' } } } }, responses: true },
  });
  return NextResponse.json(checklist, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;
  const { id } = await params;
  if (!await canAccessJob(session!.user.id!, session!.user.role as string, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const validResults = new Set(['pending', 'pass', 'fail', 'not_applicable']);
  if (!body.responseId || !validResults.has(body.result)) return NextResponse.json({ error: 'Response id and valid result required' }, { status: 400 });
  const response = await prisma.checklistResponse.update({ where: { id: body.responseId }, data: { result: body.result as ChecklistResult, notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 5000) : null, photos: Array.isArray(body.photos) ? body.photos.filter((value: unknown) => typeof value === 'string').slice(0, 10) : [] } });
  const checklist = await prisma.jobChecklist.findUnique({ where: { id: response.jobChecklistId }, include: { responses: true } });
  if (checklist && checklist.responses.every((item) => item.result !== 'pending')) await prisma.jobChecklist.update({ where: { id: checklist.id }, data: { completedAt: new Date(), completedBy: session!.user.id } });
  await auditServiceAction(session!, 'update_checklist', `Updated checklist response ${response.id}`, id);
  return NextResponse.json(response);
}
