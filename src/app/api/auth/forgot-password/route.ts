import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/app/lib/db';
import { sendPasswordResetEmail } from '@/app/lib/email/send';

// Simple in-memory rate limit: max 3 requests per email per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= 3) {
      return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count++;
    return { allowed: true };
  }

  // Reset window
  rateLimitMap.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Rate limit check
    const limitCheck = checkRateLimit(email);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${limitCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Don't reveal whether the account exists (security best practice)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Generate token and hash it before storing
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token: hashedToken, // Store HASHED token
        expiresAt,
      },
    });

    // Build reset URL — send the RAW token (not the hash)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const resetUrl = `${appUrl}/auth/reset-password/${rawToken}`;

    const result = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name || 'User',
      resetUrl,
    });

    if (!result.success) {
      // Email failed — clean up the hashed token
      await prisma.passwordResetToken.delete({ where: { token: hashedToken } });
      console.error('Failed to send password reset email:', result.error);
      // Don't reveal to user that the email exists — return generic success
      return NextResponse.json({ ok: true });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || 'User',
        action: 'password_reset',
        reason: `Password reset email sent to ${user.email}`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
