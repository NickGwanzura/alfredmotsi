import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { createPasswordResetToken, revokePasswordResetToken, revokePasswordResetTokensForEmail } from '@/app/lib/auth/password-reset';
import { sendPasswordResetEmail } from '@/app/lib/email/send';
import { getAppOrigin } from '@/app/lib/brand';

/**
 * POST /api/admin/users/resend-credentials
 * Sends a fresh, single-use password setup link. Passwords are never sent by
 * email and the existing password remains valid until the link is used.
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
  if (!user.email) return NextResponse.json({ error: 'User has no email address' }, { status: 400 });

  await revokePasswordResetTokensForEmail(user.email);
  const rawToken = await createPasswordResetToken(user.email);
  const appUrl = getAppOrigin();
  const result = await sendPasswordResetEmail({
    to: user.email,
    userName: user.name,
    resetUrl: `${appUrl.replace(/\/$/, '')}/auth/reset-password/${rawToken}`,
  });

  if (!result.success) {
    await revokePasswordResetToken(rawToken);
    return NextResponse.json({ error: 'Failed to send password setup email' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
