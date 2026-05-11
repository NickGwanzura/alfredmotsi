import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role: string; name?: string | null };
  const { id } = await params;

  const consumable = await prisma.consumable.findUnique({ where: { id } });
  if (!consumable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only admin or the person who recorded it can delete
  if (user.role !== 'admin' && consumable.recordedBy !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.consumable.delete({ where: { id } });

   // Audit
   await prisma.auditLog.create({
     data: {
       userId: user.id,
       userName: user.name || 'Unknown',
       action: 'delete_consumable',
       jobId: consumable.jobId,
       reason: `Consumable deleted: ${consumable.name} (${consumable.quantity} ${consumable.unit})`,
       ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 request.headers.get('x-real-ip') || null,
       userAgent: request.headers.get('user-agent') || null,
     },
   }).catch(() => {});

  return NextResponse.json({ success: true });
}
