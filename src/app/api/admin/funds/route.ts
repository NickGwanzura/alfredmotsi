import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { FROM_EMAIL } from '@/app/lib/email/resend';

const fundInclude = {
  tech: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  expenses: {
    include: {
      job: { select: { id: true, jobCardRef: true, title: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { recordedAt: 'desc' as const },
  },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = session.user.id!;

  // Admin sees all, tech sees only their own
  const where = role === 'admin' ? {} : { techId: userId };

  const allocations = await prisma.fundAllocation.findMany({
    where,
    include: fundInclude,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(allocations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, amount, techId, notes } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  if (!techId) {
    return NextResponse.json({ error: 'Technician is required' }, { status: 400 });
  }

  const tech = await prisma.user.findUnique({ where: { id: techId } });
  if (!tech || tech.role !== 'tech') {
    return NextResponse.json({ error: 'Invalid technician' }, { status: 400 });
  }

  const allocation = await prisma.fundAllocation.create({
    data: {
      name: name || null,
      amount,
      techId,
      createdById: session.user.id!,
      notes: notes || null,
    },
    include: fundInclude,
  });

  // Notification email to tech
  if (tech.email) {
    const fundName = name || 'Fund Allocation';
    sendCustomEmail({
      to: tech.email,
      subject: `💰 ${fundName} — $${amount} allocated to you`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#0a3d6b;">Funds Allocated</h2>
        <p>Hi <strong>${tech.name}</strong>,</p>
        <p>You have been allocated <strong>$${amount.toFixed(2)}</strong>${name ? ` for <em>${name}</em>` : ''}.</p>
        ${notes ? `<p>Notes: ${notes}</p>` : ''}
        <p style="color:#666;font-size:13px;">Log into the system to view your funds and record expenses.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="color:#999;font-size:12px;">Splash Air Conditioning</p>
      </div>`,
      category: 'fund-allocated',
    }).catch(() => {}); // silent fail
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id!,
      userName: (session.user as any).name || 'Admin',
      action: 'allocate_fund',
      reason: `$${amount} allocated to ${tech.name}${name ? ` — ${name}` : ''}`,
    },
  });

  return NextResponse.json(allocation, { status: 201 });
}
