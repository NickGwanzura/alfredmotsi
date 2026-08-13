import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !['owner', 'admin', 'accounts'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const item = await prisma.inventoryItem.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
