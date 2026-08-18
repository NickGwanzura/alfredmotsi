import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, email, role, phone, specialty, newPassword } = body;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (session.user.role !== 'owner' && target.role === 'owner') {
    return NextResponse.json({ error: 'Only an owner can modify an owner account' }, { status: 403 });
  }

  if (role && !['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech', 'client'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Prevent admin from removing their own admin role
  if (id === session.user.id && role && role !== session.user.role) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }
  if (role === 'owner' && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Only an owner can assign the owner role' }, { status: 403 });
  }

  // If email is changing, check it isn't already taken
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedEmail) {
    const conflict = await prisma.user.findFirst({ where: { email: normalizedEmail, NOT: { id } } });
    if (conflict) return NextResponse.json({ error: 'Email already in use by another user' }, { status: 409 });
  }

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = String(name).trim().slice(0, 160);
  if (normalizedEmail) updateData.email = normalizedEmail;
  if (role) updateData.role = role;
  if (phone !== undefined) updateData.phone = phone || null;
  if (specialty !== undefined) updateData.specialty = specialty || null;
  if (newPassword) {
    if (typeof newPassword !== 'string' || newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    updateData.password = await bcrypt.hash(newPassword, 12);
    updateData.passwordChanged = false;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, phone: true, specialty: true },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userName: (session.user as any).name || 'Unknown',
      action: 'update_user',
      jobId: null,
      reason: `User updated: ${name || user.name} (${email || user.email})`,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
    },
  }).catch(() => {});

  return NextResponse.json({ user });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (session.user.role !== 'owner' && targetUser.role === 'owner') {
    return NextResponse.json({ error: 'Only an owner can delete an owner account' }, { status: 403 });
  }

  // Reassign related records to the deleting admin before removing the user
  const adminId = session.user.id;
  await prisma.$transaction([
    prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: adminId } }),
    prisma.gasUsageRecord.updateMany({ where: { usedBy: id }, data: { usedBy: adminId } }),
    prisma.consumable.updateMany({ where: { recordedBy: id }, data: { recordedBy: adminId } }),
  ]);

  await prisma.user.delete({ where: { id } });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userName: (session.user as any).name || 'Unknown',
      action: 'delete_user',
      jobId: null,
      reason: `User deleted: ${targetUser.name} (${targetUser.email})`,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
    },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
