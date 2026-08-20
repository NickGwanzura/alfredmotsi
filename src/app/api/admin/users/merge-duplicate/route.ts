import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { mergeUserRecords } from '@/app/lib/user-merge';

/**
 * POST /api/admin/users/merge-duplicate
 * Finds users with the same email but different roles (e.g. splashaircon@gmail.com
 * being both admin and tech). Keeps the admin account and deletes the rest.
 *
 * Body: { email: string }
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const actorIsOwner = session.user.role === 'owner';

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const users = await prisma.user.findMany({
    where: { email: email.toLowerCase().trim() },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length < 2) {
    return NextResponse.json({ message: 'No duplicates found for this email', count: users.length });
  }

  const ownerUser = users.find(u => u.role === 'owner');
  if (ownerUser && !actorIsOwner) {
    return NextResponse.json({ error: 'Only the owner can merge an owner account' }, { status: 403 });
  }

  // Keep the owner first, then an admin account, otherwise keep the oldest.
  const adminUser = users.find(u => u.role === 'admin');
  const keep = ownerUser || adminUser || users[0];
  const toDelete = users.filter(u => u.id !== keep.id && u.id !== session.user.id);

  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    for (const del of toDelete) {
      await mergeUserRecords(tx, del.id, keep.id);
      deleted++;
    }
  });

  return NextResponse.json({
    message: `Merged ${deleted} duplicate(s) into ${keep.name} (${keep.email})`,
    keptUserId: keep.id,
    keptRole: keep.role,
    deleted,
  });
}
