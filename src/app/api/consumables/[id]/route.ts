import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const consumable = await prisma.consumable.findUnique({ where: { id } });
  if (!consumable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only admin or the person who recorded it can delete
  if (user.role !== 'admin' && consumable.recordedBy !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.consumable.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
