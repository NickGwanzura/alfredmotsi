import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendCustomEmail } from '@/app/lib/email/send';

/**
 * POST /api/email/send
 * Sends a custom email via Resend to a customer.
 * Requires authentication (admin or tech).
 *
 * Body: { to: string, subject: string, body: string, customerName?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, subject, body, customerName } = await request.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'To, subject, and body are required' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: 'Invalid recipient email address' }, { status: 400 });
  }

  // Build a simple branded HTML email
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#093a68,#062d52);padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">Splash Air</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Air Conditioning Specialists</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  ${customerName ? `<p style="margin:0 0 16px;color:#525252;font-size:14px;">Dear ${customerName.replace(/</g, '&lt;')},</p>` : ''}
                  <p style="margin:0 0 16px;color:#525252;font-size:14px;line-height:1.6;white-space:pre-wrap;">${body.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>
                  <p style="margin:0;color:#525252;font-size:14px;">Kind regards,<br/><strong style="color:#161616;">Splash Air Conditioning</strong></p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e0e0e0;">
                  <p style="margin:0;color:#6f6f6f;font-size:11px;text-align:center;">
                    Splash Air Conditioning &middot; For support: 011 000 0001<br/>
                    <a href="mailto:info@splashaircrmzw.site" style="color:#093a68;text-decoration:none;">info@splashaircrmzw.site</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

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
