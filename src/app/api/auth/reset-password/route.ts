import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Use Prisma Client instead of raw SQL
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
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

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: {
          password: hashedPassword,
          passwordChanged: true,
        },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
