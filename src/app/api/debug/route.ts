import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export async function GET() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'splashaircon' } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json({ users });
}
