import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};

    if (userRole !== 'admin') {
      where.role = 'tech';
    } else if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        specialty: true,
        status: true,
        image: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
