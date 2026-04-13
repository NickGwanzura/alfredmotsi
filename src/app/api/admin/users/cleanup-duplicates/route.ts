import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

/**
 * POST /api/admin/users/cleanup-duplicates
 * Finds users with duplicate emails, keeps the oldest account, deletes the rest.
 * Never deletes the currently logged-in admin.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by normalised email
  const byEmail = new Map<string, typeof users>();
  for (const u of users) {
    const key = u.email.toLowerCase().trim();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(u);
  }

  const toDelete: string[] = [];
  for (const [, group] of byEmail) {
    if (group.length < 2) continue;
    // Oldest (index 0) is kept; all newer duplicates are deleted unless it's the current admin
    for (const u of group.slice(1)) {
      if (u.id !== session.user.id) toDelete.push(u.id);
    }
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ removed: 0 });
  }

  await prisma.user.deleteMany({ where: { id: { in: toDelete } } });

  return NextResponse.json({ removed: toDelete.length });
}
