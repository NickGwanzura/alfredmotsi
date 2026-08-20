import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/password';
import { createPasswordResetToken, revokePasswordResetToken } from '@/app/lib/auth/password-reset';
import { sendPasswordResetEmail } from '@/app/lib/email/send';
import { getAppOrigin } from '@/app/lib/brand';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      specialty: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { name, email, role, phone, specialty } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (role === 'owner' && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Only an owner can create another owner account' }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // The account starts with an unguessable password. The user sets the real
  // password through the single-use link sent below; no password is emailed.
  const hashedPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));

   const user = await prisma.user.create({
     data: {
       name,
       email: normalizedEmail,
       role,
       password: hashedPassword,
       passwordChanged: false, // New users must change temp password
       phone: phone || null,
       specialty: specialty || null,
       status: role === 'tech' ? 'available' : null,
     },
     select: {
       id: true,
       name: true,
       email: true,
       role: true,
       createdAt: true,
     },
   });

   const rawToken = await createPasswordResetToken(user.email);
   const appUrl = getAppOrigin();
   // Keep the opaque token intact when email clients rewrite URL characters.
   const resetUrl = `${appUrl.replace(/\/$/, '')}/auth/reset-password/${encodeURIComponent(rawToken)}`;
   const emailResult = await sendPasswordResetEmail({
     to: user.email,
     userName: user.name,
     resetUrl,
   });

   if (!emailResult.success) {
     await revokePasswordResetToken(rawToken);
   }

   // Audit
   await prisma.auditLog.create({
     data: {
       userId: session.user.id,
       userName: (session.user as any).name || 'Unknown',
       action: 'create_user',
       jobId: null,
       reason: `User created: ${name} (${normalizedEmail}, ${role})`,
       ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 request.headers.get('x-real-ip') || null,
       userAgent: request.headers.get('user-agent') || null,
     },
   }).catch(() => {});

   return NextResponse.json({
     user,
     setupEmailSent: emailResult.success,
     warning: emailResult.success ? undefined : 'User created, but the setup email could not be sent. Use resend setup link.',
   }, { status: 201 });
}
