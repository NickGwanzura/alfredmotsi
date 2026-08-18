import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { sendCustomEmail } from '@/app/lib/email/send';
import { escapeEmailHtml, renderPremiumEmail } from '@/app/lib/email/premium-shell';
import { prisma } from '@/app/lib/db';

const sendRateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * POST /api/email/send
 * Sends a custom email via Resend to a customer.
 * Requires admin or tech role.
 *
 * Body: { to: string, subject: string, body: string, customerName?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admins and technicians may send emails on behalf of the company.
  const forbidden = authorizeRole(session, ['admin', 'tech']);
  if (forbidden) return forbidden;

  const { to, subject, body, customerName } = await request.json();

  const key = `${session.user.id}:${new Date().toISOString().slice(0, 13)}`;
  const current = sendRateLimit.get(key);
  if (current && current.count >= 20) return NextResponse.json({ error: 'Email sending limit reached. Try again later.' }, { status: 429 });
  sendRateLimit.set(key, { count: (current?.count || 0) + 1, resetAt: Date.now() + 60 * 60 * 1000 });
  if (sendRateLimit.size > 10_000) {
    for (const [entryKey, entry] of sendRateLimit) if (entry.resetAt < Date.now()) sendRateLimit.delete(entryKey);
  }

  if (typeof to !== 'string' || typeof subject !== 'string' || typeof body !== 'string' || !to.trim() || !subject.trim() || !body.trim() || subject.length > 200 || body.length > 20_000) {
    return NextResponse.json({ error: 'To, subject, and body are required' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: 'Invalid recipient email address' }, { status: 400 });
  }

  if (session.user.role === 'tech') {
    const customer = await prisma.customer.findFirst({ where: { email: to.trim().toLowerCase() }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: 'Technicians may only email CRM customers' }, { status: 403 });
  }

  const safeBody = escapeEmailHtml(body).replace(/\n/g, '<br>');
  const html = renderPremiumEmail({
    preview: subject.trim(),
    eyebrow: 'Customer message',
    title: subject.trim(),
    recipientName: customerName,
    bodyHtml: `<p style="margin:0;white-space:pre-wrap;">${safeBody}</p>`,
  });

  try {
    const result = await sendCustomEmail({
      to,
      subject: subject.trim(),
      html,
      category: 'customer-email',
      isTransactional: true,
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: `Email sent to ${to}` });
    } else {
      const errorMsg = result.error 
        ? (typeof result.error === 'string' ? result.error : 'Failed to send email')
        : 'Failed to send email';
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  } catch (err) {
    console.error('Error sending email:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
