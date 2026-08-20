import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/db';
import { hashPasswordResetToken } from '@/app/lib/auth/password-reset';
import { validateNewPassword } from '@/app/lib/auth/password-policy';

const resetAttemptMap = new Map<string, { count: number; resetAt: number }>();

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() || '';
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  if (!token) return NextResponse.json({ valid: false, error: 'Reset token is missing' }, { status: 400, headers });
  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashPasswordResetToken(token) }, select: { used: true, expiresAt: true } });
  if (!record || record.used) return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' }, { status: 400, headers });
  if (record.expiresAt <= new Date()) return NextResponse.json({ valid: false, error: 'This reset link has expired' }, { status: 400, headers });
  return NextResponse.json({ valid: true, expiresAt: record.expiresAt }, { headers });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const hashedToken = hashPasswordResetToken(token);
    // Rate-limit by the opaque token itself rather than trusting spoofable
    // forwarded-IP headers. Invalid guesses are rejected before bcrypt work.
    const clientKey = hashedToken;
    const now = Date.now();
    if (resetAttemptMap.size > 10_000) {
      for (const [staleKey, staleEntry] of resetAttemptMap) {
        if (staleEntry.resetAt <= now) resetAttemptMap.delete(staleKey);
      }
    }
    const current = resetAttemptMap.get(clientKey);
    if (current && now < current.resetAt && current.count >= 10) {
      return NextResponse.json({ error: 'Too many reset attempts. Try again later.' }, { status: 429 });
    }
    if (!current || now >= current.resetAt) resetAttemptMap.set(clientKey, { count: 1, resetAt: now + 10 * 60 * 1000 });
    else current.count += 1;

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    if (record.used) {
      return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return NextResponse.json({ error: 'This reset link has expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Claim the token atomically. A second concurrent request cannot reset
    // the password because its conditional update will affect zero rows.
    const resetResult = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { token: hashedToken, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });
      if (claimed.count !== 1) throw new Error('INVALID_RESET_TOKEN');
      const user = await tx.user.update({
        where: { email: record.email },
        data: { password: hashedPassword, passwordChanged: true },
        select: { id: true, name: true, email: true },
      });
      await tx.passwordResetToken.updateMany({ where: { email: record.email, used: false }, data: { used: true } });
      return user;
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === 'INVALID_RESET_TOKEN') return null;
      throw error;
    });
    if (!resetResult) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: resetResult.id,
        userName: resetResult.name || resetResult.email,
        action: 'password_reset',
        reason: `Password reset completed for ${record.email}`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
