import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/app/lib/db';
import { sendPasswordResetEmail } from '@/app/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    // Don't reveal whether the account exists (security best practice)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Use Prisma Client instead of raw SQL for type safety
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    // Build reset URL from environment variable with fallback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://splashaircrmzw.site';
    const resetUrl = `${appUrl}/auth/reset-password/${token}`;

    const result = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name || 'User',
      resetUrl,
    });

    if (!result.success) {
      // Email failed to send — clean up the token so it's not orphaned
      await prisma.passwordResetToken.delete({ where: { token } });
      console.error('Failed to send password reset email:', result.error);
      return NextResponse.json({ error: 'Failed to send reset email. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
