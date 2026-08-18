import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { FINANCE_ROLES, FIELD_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { session, error } = await serviceSession([...FIELD_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES, 'sales']);
    if (error) return error;

    const userRole = (session.user as any).role;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};

    if (!['owner', 'admin'].includes(userRole)) {
      where.role = 'tech';
    } else if (role) {
      if (!['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech', 'client'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 });
      }
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
