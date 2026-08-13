import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/app/lib/db';
import { InvoicePDF } from '@/app/lib/pdf/invoicePdf';
import { loadCompany } from '@/app/lib/pdf/company';
import { sendEmailWithBestPractices } from '@/app/lib/email/send';
import { auditServiceAction, FINANCE_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import { emitServiceNotification } from '@/app/lib/notifications/provider';
import { renderPremiumEmail } from '@/app/lib/email/premium-shell';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await serviceSession(FINANCE_ROLES);
  if (error) return error;
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { customer: true, lineItems: true, job: { select: { jobCardRef: true, title: true } } } });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (!invoice.customer.email) return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 });
  const company = await loadCompany();
  const pdf = await renderToBuffer(InvoicePDF({ invoice, company }));
  const outstanding = invoice.balance.toFixed(2);
  const html = renderPremiumEmail({
    preview: `Invoice ${invoice.invoiceRef} - balance $${outstanding}`,
    eyebrow: 'Invoice',
    title: invoice.invoiceRef,
    recipientName: invoice.customer.name,
    bodyHtml: `<p style="margin:0 0 18px;">Your invoice is attached as a branded PDF.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eef5;border-left:4px solid #093a68;"><tr><td style="padding:18px 20px;"><span style="display:block;color:#525252;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Outstanding balance</span><strong style="display:block;margin-top:4px;color:#062d52;font-size:24px;">$${outstanding}</strong><span style="display:block;margin-top:5px;color:#525252;font-size:13px;">Due ${invoice.dueDate}</span></td></tr></table>`,
    footerNote: `Invoice ${invoice.invoiceRef}`,
  });
  const result = await sendEmailWithBestPractices({ to: invoice.customer.email, subject: `Invoice ${invoice.invoiceRef} from ${company.name}`, html, category: 'invoice', isTransactional: true, attachments: [{ filename: `${invoice.invoiceRef}.pdf`, content: pdf, contentType: 'application/pdf' }] });
  if (!result.success) return NextResponse.json({ success: false, error: typeof result.error === 'string' ? result.error : 'Email delivery failed' }, { status: 502 });
  const updated = await prisma.invoice.update({ where: { id }, data: { status: invoice.status === 'draft' ? 'sent' : invoice.status } });
  await auditServiceAction(session!, 'send_invoice', `Sent invoice ${invoice.invoiceRef}`, invoice.jobId);
  await emitServiceNotification({ event: 'invoice.sent', channel: 'email', recipient: invoice.customer.email, customerId: invoice.customerId, jobId: invoice.jobId || undefined, referenceId: invoice.id, payload: { invoiceRef: invoice.invoiceRef, balance: invoice.balance } });
  return NextResponse.json({ success: true, invoice: updated });
}
