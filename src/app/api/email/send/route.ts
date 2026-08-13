import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { sendCustomEmail } from '@/app/lib/email/send';
import { escapeEmailHtml, renderPremiumEmail } from '@/app/lib/email/premium-shell';

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

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'To, subject, and body are required' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: 'Invalid recipient email address' }, { status: 400 });
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
