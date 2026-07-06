import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/app/lib/db';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Hash the incoming token before looking it up
    const hashedToken = hashToken(token);

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

    // Transaction: update password + invalidate ALL tokens for this email
    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: {
          password: hashedPassword,
          passwordChanged: true,
        },
      }),
      prisma.passwordResetToken.update({
        where: { token: hashedToken },
        data: { used: true },
      }),
      // Invalidate any other unused tokens for this email
      prisma.passwordResetToken.updateMany({
        where: { email: record.email, used: false },
        data: { used: true },
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userName: record.email,
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
