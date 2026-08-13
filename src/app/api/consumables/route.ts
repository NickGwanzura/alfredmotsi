import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { canAccessJob, cleanText, positiveNumber } from '@/app/lib/serviceAuth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admins and technicians may view consumables.
  const forbidden = authorizeRole(session, ['admin', 'tech']);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const userId = searchParams.get('userId');

  const where: Record<string, unknown> = {};
  if (jobId) where.jobId = jobId;
  if (userId) where.recordedBy = userId;
  const currentUser = session.user as { id: string; role: string };
  if (!['admin', 'owner'].includes(currentUser.role)) {
    if (jobId) {
      if (!await canAccessJob(currentUser.id, currentUser.role, jobId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      where.recordedBy = currentUser.id;
    }
  }

  const consumables = await prisma.consumable.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
  });

  return NextResponse.json(consumables);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forbidden = authorizeRole(session, ['admin', 'tech']);
  if (forbidden) return forbidden;

  const body = await request.json();
  const { jobId, type, name, brand, model, quantity, unit, notes } = body;

  if (!jobId || !type || !name || !quantity || !unit) {
    return NextResponse.json({ error: 'jobId, type, name, quantity, and unit are required' }, { status: 400 });
  }

  const user = session.user as { id: string; name?: string; role: string };
  if (!await canAccessJob(user.id, user.role, jobId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsedQuantity = positiveNumber(quantity);
  if (!parsedQuantity) return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
  const validTypes = new Set(['gas', 'compressor', 'part', 'other']);
  if (!validTypes.has(type)) return NextResponse.json({ error: 'Invalid consumable type' }, { status: 400 });

   const consumable = await prisma.consumable.create({
     data: {
       jobId,
       type,
       name: cleanText(name, 180),
       brand: cleanText(brand, 120) || null,
       model: cleanText(model, 120) || null,
       quantity: parsedQuantity,
       unit: cleanText(unit, 30),
       notes: cleanText(notes, 2000) || null,
       recordedBy: user.id,
     },
   });

   await prisma.auditLog.create({
     data: {
       userId: user.id,
       userName: user.name || 'Unknown',
       action: 'create_consumable',
       jobId,
       reason: `Consumable added: ${quantity} ${unit} of ${name} (${type})`,
       ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 request.headers.get('x-real-ip') || null,
       userAgent: request.headers.get('user-agent') || null,
     },
   }).catch(() => {});

   return NextResponse.json(consumable, { status: 201 });
}
