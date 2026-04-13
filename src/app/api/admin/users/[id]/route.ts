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

  if (role && !['admin', 'tech', 'client'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Prevent admin from removing their own admin role
  if (id === session.user.id && role && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  // If email is changing, check it isn't already taken
  if (email) {
    const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (conflict) return NextResponse.json({ error: 'Email already in use by another user' }, { status: 409 });
  }

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name.trim();
  if (email) updateData.email = email.trim().toLowerCase();
  if (role) updateData.role = role;
  if (phone !== undefined) updateData.phone = phone || null;
  if (specialty !== undefined) updateData.specialty = specialty || null;
  if (newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 12);
    updateData.passwordChanged = false;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, phone: true, specialty: true },
  });

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

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
