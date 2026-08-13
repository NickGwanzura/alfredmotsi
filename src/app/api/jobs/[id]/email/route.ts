import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { generateJobCardPdf } from '@/app/lib/pdf/jobCardPdf';
import { loadCompany } from '@/app/lib/pdf/company';
import { sendEmailWithBestPractices } from '@/app/lib/email/send';
import { generatePreviewText } from '@/app/lib/email/standards';
import { escapeEmailHtml } from '@/app/lib/email/premium-shell';
import { BRAND_EMAIL, BRAND_LOGO_URL, BRAND_FONT_URL, BRAND_PHONE } from '@/app/lib/brand';

/**
 * POST /api/jobs/[id]/email
 * Generates a job card PDF and emails it to the customer via Resend.
 * Also sends a branded HTML email with a summary.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      customer: true,
      technicians: { select: { id: true, name: true, phone: true } },
      coTechnicians: { select: { id: true, name: true } },
      diagnostics: true,
      gasUsageRecords: true,
      consumables: true,
    },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const userRole = session.user.role;
  const userId = session.user.id;
  const assigned = [...job.technicians, ...job.coTechnicians].some((technician) => technician.id === userId);
  if (!isAdmin(userRole) && !assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!job.customer?.email) return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 });

  // Generate PDF with company branding
  const company = await loadCompany();
  const pdfBuffer = await generateJobCardPdf(job, company);

  // Build branded HTML email
  const address = job.customer.siteAddress || job.customer.address || '—';
  const leadTech = job.technicians?.[0]?.name || 'Not assigned';
  const diag = job.diagnostics;
  const statusLabel = job.status.replace(/-/g, ' ').replace(/_/g, ' ');
  const dateStr = new Date(job.date).toLocaleDateString('en-ZA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const e = (value: unknown) => escapeEmailHtml(String(value ?? ''));
  const logoUrl = BRAND_LOGO_URL;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>@font-face{font-family:Grift;src:url('${BRAND_FONT_URL}') format('woff2');font-weight:400}</style>
    </head>
    <body style="margin:0;padding:0;font-family:Grift,'Helvetica Neue',Arial,sans-serif;background:#f4f6f8;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:#ffffff;border-top:6px solid #093a68;border-bottom:1px solid #e0e0e0;padding:28px 40px;text-align:center;">
                  <img src="${logoUrl}" alt="Splash Air" width="180" style="display:block;margin:0 auto;" />
                  <p style="margin:8px 0 0;color:#093a68;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Air Conditioning &amp; Refrigeration</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <h1 style="margin:0 0 8px;color:#161616;font-size:22px;font-weight:600;">Job Card: ${e(job.jobCardRef)}</h1>
                  <p style="margin:0 0 24px;color:#525252;font-size:13px;">${e(job.title)} · ${e(dateStr)} · <strong>${e(statusLabel.toUpperCase())}</strong></p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="background:#f9fafb;border-radius:8px;padding:16px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%" style="vertical-align:top;padding:0 8px 8px 0;">
                              <p style="margin:0;font-size:10px;color:#6f6f6f;text-transform:uppercase;letter-spacing:0.08em;">Customer</p>
                              <p style="margin:4px 0 0;font-size:14px;color:#161616;font-weight:600;">${e(job.customer.name)}</p>
                              <p style="margin:2px 0 0;font-size:12px;color:#525252;">${e(job.customer.phone)}</p>
                              <p style="margin:2px 0 0;font-size:12px;color:#525252;">${e(address)}</p>
                            </td>
                            <td width="50%" style="vertical-align:top;padding:0 0 8px 8px;">
                              <p style="margin:0;font-size:10px;color:#6f6f6f;text-transform:uppercase;letter-spacing:0.08em;">Technician</p>
                              <p style="margin:4px 0 0;font-size:14px;color:#161616;font-weight:600;">${e(leadTech)}</p>
                              <p style="margin:4px 0 0;font-size:10px;color:#6f6f6f;text-transform:uppercase;letter-spacing:0.08em;">Unit Type</p>
                              <p style="margin:2px 0 0;font-size:12px;color:#525252;">${e(job.unitType)}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${diag ? `
                  <h2 style="margin:0 0 12px;color:#161616;font-size:15px;font-weight:600;">Diagnostic Readings</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;">
                    <thead>
                      <tr style="background:#f0f0f0;">
                        <th style="padding:8px 12px;font-size:10px;color:#161616;text-align:left;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #d1d1d1;">Parameter</th>
                        <th style="padding:8px 12px;font-size:10px;color:#161616;text-align:left;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #d1d1d1;">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${[
                        ['Supply Voltage', diag.voltage, 'V'],
                        ['Current Draw', diag.current, 'A'],
                        ['Suction Pressure', diag.suction, 'PSI'],
                        ['Discharge Pressure', diag.discharge, 'PSI'],
                        ['Avg Temp', diag.avgTemp, '°C'],
                        ['Refrigerant', diag.refrigerantType, ''],
                      ].filter(r => r[1]).map(r => `
                        <tr style="border-bottom:1px solid #e0e0e0;">
                          <td style="padding:8px 12px;font-size:12px;color:#525252;">${e(r[0])}</td>
                          <td style="padding:8px 12px;font-size:12px;color:#161616;font-family:monospace;">${e(r[1])} ${e(r[2])}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  ` : ''}

                  ${job.description ? `
                  <h2 style="margin:0 0 8px;color:#161616;font-size:15px;font-weight:600;">Scope of Work</h2>
                  <p style="margin:0 0 24px;color:#525252;font-size:13px;line-height:1.6;white-space:pre-wrap;">${e(job.description)}</p>
                  ` : ''}

                  <p style="margin:24px 0 0;color:#525252;font-size:13px;">
                    A PDF copy of your job card is attached to this email.<br/>
                    Thank you for choosing Splash Air Conditioning.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e0e0e0;">
                  <p style="margin:0;color:#6f6f6f;font-size:11px;text-align:center;">
                    Splash Air Conditioning &middot; ${BRAND_PHONE}<br/>
                    <a href="mailto:${BRAND_EMAIL}" style="color:#093a68;text-decoration:none;">${BRAND_EMAIL}</a>
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

  const previewText = generatePreviewText(`Job card ${job.jobCardRef} for ${job.customer.name}`);

  try {
    const result = await sendEmailWithBestPractices({
      to: job.customer.email,
      subject: `Job Card: ${job.jobCardRef} — ${job.title}`,
      html,
      text: previewText,
      category: 'job-card',
      isTransactional: true,
      attachments: [{
        filename: `JobCard-${job.jobCardRef || job.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: `Job card sent to ${job.customer.email}` });
    } else {
      const errorMsg = result.error
        ? (typeof result.error === 'string' ? result.error : 'Failed to send email')
        : 'Failed to send email';
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  } catch (err) {
    console.error('Error emailing job card:', err);
    return NextResponse.json({ error: 'Failed to send job card email' }, { status: 500 });
  }
}
