import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { mergeUserRecords } from '@/app/lib/user-merge';

/**
 * POST /api/admin/users/cleanup-duplicates
 * Finds users with duplicate emails, keeps the oldest account, deletes the rest.
 * Never deletes the currently logged-in admin.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const actorIsOwner = session.user.role === 'owner';

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
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
    // Preserve the owner account above every other role. An ordinary admin
    // must never be able to delete or merge an owner account.
    const ownerAcc = group.find((u) => u.role === 'owner');
    if (ownerAcc && !actorIsOwner) continue;
    const currentAcc = group.find((u) => u.id === session.user.id);
    const adminAcc = group.find((u) => u.role === 'admin');
    const keep = currentAcc || ownerAcc || adminAcc || group[0];
    for (const u of group) {
      if (u.id !== keep.id && u.id !== session.user.id) toDelete.push(u.id);
    }
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ removed: 0 });
  }

  await prisma.$transaction(async (tx) => {
    for (const duplicateId of toDelete) {
      const group = users.find((user) => user.id === duplicateId);
      if (!group) continue;
      const normalizedEmail = group.email.toLowerCase().trim();
      const keep = users.find((user) => user.email.toLowerCase().trim() === normalizedEmail && !toDelete.includes(user.id));
      if (!keep) continue;
      await mergeUserRecords(tx, duplicateId, keep.id);
    }
  });

  return NextResponse.json({ removed: toDelete.length });
}
