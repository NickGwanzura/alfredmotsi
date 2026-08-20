import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { sendPasswordResetEmail } from '@/app/lib/email/send';
import { createPasswordResetToken, revokePasswordResetToken } from '@/app/lib/auth/password-reset';
import { getAppOrigin } from '@/app/lib/brand';

// Simple in-memory rate limit: max 3 requests per email per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  if (rateLimitMap.size > 10_000) {
    for (const [staleKey, staleEntry] of rateLimitMap) {
      if (staleEntry.resetAt <= now) rateLimitMap.delete(staleKey);
    }
  }
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

    // Rate limit check (in-memory for fast rejection plus a database-backed
    // limit so it remains effective across restarts and app instances).
    const limitCheck = checkRateLimit(email);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${limitCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const recentRequests = await prisma.emailDeliveryLog.count({
      where: {
        recipient: email,
        category: 'password-reset',
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    }).catch(() => 0);
    if (recentRequests >= 3) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Don't reveal whether the account exists (security best practice)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const rawToken = await createPasswordResetToken(user.email);

    // Build reset URL — send the RAW token (not the hash)
    const appUrl = getAppOrigin();
    const resetUrl = `${appUrl}/auth/reset-password/${encodeURIComponent(rawToken)}`;

    const result = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name || 'User',
      resetUrl,
    });

    if (!result.success) {
      // Email failed — clean up the hashed token
      await revokePasswordResetToken(rawToken);
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
