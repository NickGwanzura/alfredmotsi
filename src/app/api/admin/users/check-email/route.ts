import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/admin/users/check-email?email=splashaircon@gmail.com
 * Debug endpoint - lists all accounts for an email
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 });

  const users = await prisma.user.findMany({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ users });
}
