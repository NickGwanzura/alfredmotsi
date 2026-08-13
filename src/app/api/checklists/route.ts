import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { JobType } from '@prisma/client';
import { cleanText, FIELD_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

type ChecklistItemInput = { label?: unknown; description?: unknown; requiresPhoto?: unknown };

export async function GET() {
  const { error } = await serviceSession([...FIELD_ROLES, 'sales']);
  if (error) return error;
  return NextResponse.json(await prisma.checklistTemplate.findMany({ where: { isActive: true }, include: { items: { orderBy: { sortOrder: 'asc' } } }, orderBy: { name: 'asc' } }));
}

export async function POST(request: NextRequest) {
  const { error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const body = await request.json();
  const name = cleanText(body.name, 160);
  if (!name || !Array.isArray(body.items) || !body.items.length) return NextResponse.json({ error: 'Name and checklist items are required' }, { status: 400 });
  const template = await prisma.checklistTemplate.create({
    data: {
      name, description: cleanText(body.description) || null, jobType: body.jobType as JobType || null,
      items: { create: body.items.map((item: ChecklistItemInput, index: number) => ({ label: cleanText(item.label, 300), description: cleanText(item.description, 1000) || null, sortOrder: index, requiresPhoto: Boolean(item.requiresPhoto) })) },
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  return NextResponse.json(template, { status: 201 });
}
