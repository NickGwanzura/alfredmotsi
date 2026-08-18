import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { escapeEmailHtml, renderPremiumEmail } from '@/app/lib/email/premium-shell';
import { isAdmin } from '@/app/lib/auth/auth';
import { cleanText, positiveNumber } from '@/app/lib/serviceAuth';

const fundInclude = {
  tech: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  expenses: {
    include: {
      job: { select: { id: true, jobCardRef: true, title: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { recordedAt: 'desc' as const },
    take: 500,
  },
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = session.user.id!;

  // Admin sees all, tech sees only their own
  const where = isAdmin(role || '') ? {} : { techId: userId };

  const allocations = await prisma.fundAllocation.findMany({
    where,
    include: fundInclude,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(allocations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin((session.user as { role?: string }).role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, amount, techId, notes } = await req.json();
  const parsedAmount = positiveNumber(amount);

  if (parsedAmount === null || parsedAmount > 100_000_000) {
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
      name: cleanText(name, 200) || null,
      amount: parsedAmount,
      techId,
      createdById: session.user.id!,
      notes: cleanText(notes, 2_000) || null,
    },
    include: fundInclude,
  });

  // Notification email to tech
  if (tech.email) {
    const fundName = cleanText(name, 200) || 'Fund Allocation';
    sendCustomEmail({
      to: tech.email,
      subject: `💰 ${fundName} — $${parsedAmount} allocated to you`,
      html: renderPremiumEmail({
        preview: `${fundName}: $${parsedAmount.toFixed(2)} allocated`,
        eyebrow: 'Technician funds',
        title: 'Funds allocated',
        recipientName: tech.name,
        bodyHtml: `<p style="margin:0 0 18px;">A new allocation has been added to your account.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eef5;border-left:4px solid #093a68;"><tr><td style="padding:18px 20px;"><span style="display:block;color:#525252;font-size:11px;text-transform:uppercase;letter-spacing:1px;">${escapeEmailHtml(fundName)}</span><strong style="display:block;margin-top:4px;color:#062d52;font-size:24px;">$${parsedAmount.toFixed(2)}</strong>${notes ? `<span style="display:block;margin-top:8px;color:#525252;font-size:13px;">${escapeEmailHtml(cleanText(notes, 2_000))}</span>` : ''}</td></tr></table><p style="margin:18px 0 0;">Sign in to view the allocation and record expenses.</p>`,
        cta: { label: 'Open Splash Air CRM', url: process.env.NEXTAUTH_URL || 'https://splashaircrmzw.site' },
      }),
      category: 'fund-allocated',
    }).catch(() => {}); // silent fail
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id!,
      userName: session.user.name || 'Admin',
      action: 'allocate_fund',
      reason: `$${parsedAmount} allocated to ${tech.name}${name ? ` — ${name}` : ''}`,
    },
  });

  return NextResponse.json(allocation, { status: 201 });
}
