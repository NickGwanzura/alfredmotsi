import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendUserInviteEmail } from '@/app/lib/email/send';

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits), pick(special)];
  for (let i = 0; i < 3; i++) base.push(pick(upper + lower + digits));
  return base.sort(() => Math.random() - 0.5).join('');
}

/**
 * POST /api/admin/users/resend-credentials
 * Generates a new temp password for a user and sends their credentials by email.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const tempPw = generateTempPassword();
  const hashed = await bcrypt.hash(tempPw, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, passwordChanged: false },
  });

  const result = await sendUserInviteEmail({
    to: user.email,
    userName: user.name,
    tempPassword: tempPw,
    role: user.role,
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Password reset but email failed to send', detail: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
