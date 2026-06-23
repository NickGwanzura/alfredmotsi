'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Job, User } from '@/app/types';
import { TYPE_CFG } from '@/app/lib/config';
import { canManageCustomers } from '@/app/lib/permissions';
import { buildWA, buildMail, portalInviteText, fmtDate } from '@/app/lib/utils';
import { sendPortalInviteEmail } from '@/app/lib/email/client';
import { StatusTag, SectionTitle, Avatar, Notification } from './ui';
import { Plus, FileEdit, MessageCircle, Mail, Users, ChevronRight, X, Send, CheckCheck } from 'lucide-react';

interface CustomerDBProps {
  customers: Customer[];
  jobs: Job[];
  currentUser: User;
  onJobClick: (job: Job) => void;
  onEditCustomer?: (customer: Customer) => void;
  onAddCustomer?: (customer: Customer) => void;
}

type Compose = 'wa' | 'email' | null;
type EmailTemplate = 'custom' | 'portal-invite' | 'service-reminder';
type WATemplate = 'greeting' | 'portal-invite' | 'service-reminder' | 'custom';

const AVATAR_COLORS = ['#0f62fe', '#198038', '#9f1853', '#6929c4', '#005d5d', '#8a3800', '#003a6d'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function CustomerDB({ customers, jobs, currentUser, onJobClick, onEditCustomer, onAddCustomer }: CustomerDBProps) {
  if (!canManageCustomers(currentUser.role)) return null;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [compose, setCompose] = useState<Compose>(null);
  const [toast, setToast] = useState<{ kind: 'e' | 's'; msg: string } | null>(null);

  // WhatsApp compose state
  const [waTemplate, setWATemplate] = useState<WATemplate>('greeting');
  const [waMsg, setWAMsg] = useState('');

  // Email compose state
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>('custom');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.address.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      c.email.toLowerCase().includes(s)
    );
  }, [customers, search]);

  const active = selected ?? filtered[0] ?? null;
  const customerJobs = useMemo(
    () => active
      ? jobs.filter(j => j.customerId === active.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [],
    [active, jobs]
  );

  const jobCount = (id: string) => jobs.filter(j => j.customerId === id).length;

  // When customer changes, reset compose panels
  useEffect(() => {
    setCompose(null);
  }, [active?.id]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Build WA message from template
  const buildWAMessage = (c: Customer, tpl: WATemplate): string => {
    switch (tpl) {
      case 'greeting':
        return `Hi ${c.name}, this is Splash Air Conditioning. How can we help you today?`;
      case 'portal-invite':
        return portalInviteText(c);
      case 'service-reminder':
        return `Dear ${c.name},\n\nThis is a friendly reminder from Splash Air Conditioning that your scheduled service is coming up.\n\nPlease ensure site access is available. Call us on 011 000 0001 for any queries.\n\nThank you,\nSplash Air Conditioning`;
      case 'custom':
        return waMsg;
    }
  };

  const openWACompose = () => {
    if (!active) return;
    setWATemplate('greeting');
    setWAMsg(`Hi ${active.name}, `);
    setCompose(c => c === 'wa' ? null : 'wa');
  };

  const openEmailCompose = () => {
    if (!active) return;
    setEmailTemplate('custom');
    setEmailSubject('Splash Air — Service Update');
    setEmailBody(`Dear ${active.name},\n\n\n\nKind regards,\nSplash Air Conditioning`);
    setCompose(c => c === 'email' ? null : 'email');
  };

  const handleWATemplateChange = (tpl: WATemplate) => {
    setWATemplate(tpl);
    if (active && tpl !== 'custom') setWAMsg(buildWAMessage(active, tpl));
  };

  const handleEmailTemplateChange = (tpl: EmailTemplate) => {
    if (!active) return;
    setEmailTemplate(tpl);
    if (tpl === 'portal-invite') {
      setEmailSubject('Your Splash Air Client Portal Access');
      setEmailBody(`Dear ${active.name},\n\nYou have been invited to the Splash Air Client Portal.\n\nYour portal access code: ${active.portalCode}\nYour login email: ${active.email}\n\nWith your portal you can:\n- View all your service history\n- Track live job progress\n- Book new service requests\n\nKind regards,\nSplash Air Conditioning`);
    } else if (tpl === 'service-reminder') {
      setEmailSubject('Upcoming Service Reminder — Splash Air');
      setEmailBody(`Dear ${active.name},\n\nThis is a friendly reminder that your scheduled service is coming up soon.\n\nPlease ensure site access is available and contact us on 011 000 0001 for any queries.\n\nKind regards,\nSplash Air Conditioning`);
    } else {
      setEmailSubject('Splash Air — Service Update');
      setEmailBody(`Dear ${active.name},\n\n\n\nKind regards,\nSplash Air Conditioning`);
    }
  };

  const sendEmail = async () => {
    if (!active) return;
    setEmailSending(true);
    try {
      if (emailTemplate === 'portal-invite') {
        // Send branded portal invite via Resend
        const result = await sendPortalInviteEmail({
          to: active.email,
          customerName: active.name,
          portalCode: active.portalCode ?? '',
        });
        if (result.success) {
          setToast({ kind: 's', msg: `Portal invite sent to ${active.email}` });
          setCompose(null);
        } else {
          setToast({ kind: 'e', msg: result.error ?? 'Failed to send email' });
        }
      } else {
        // For custom / service reminder: open mailto as fallback
        window.open(buildMail(active.email, emailSubject, emailBody), '_blank');
        setToast({ kind: 's', msg: 'Email client opened.' });
        setCompose(null);
      }
    } catch {
      setToast({ kind: 'e', msg: 'Failed to send. Check your connection.' });
    } finally {
      setEmailSending(false);
    }
  };

  const launchWhatsApp = () => {
    if (!active) return;
    const msg = waTemplate === 'custom' ? waMsg : buildWAMessage(active, waTemplate);
    window.open(buildWA(active.whatsapp || active.phone, msg), '_blank');
    setCompose(null);
  };

  const openEmpty = () => onAddCustomer?.({ id: '', name: '', address: '', siteAddress: '', phone: '', whatsapp: '', email: '', portalCode: '', portalEnabled: false });

  return (
    <div className="animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] min-w-[280px] max-w-[360px]">
          <Notification kind={toast.kind} title={toast.kind === 's' ? 'Sent' : 'Error'} body={toast.msg} />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-xl font-semibold m-0">Customers</h1>
          <p className="text-sm text-text-secondary m-0">{filtered.length} records</p>
        </div>
        {onAddCustomer && (
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 border-none cursor-pointer hover:bg-interactive-hover transition-colors rounded"
            onClick={openEmpty}
          >
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '340px 1fr' }}>

        {/* ── Left panel ── */}
        <div className="flex flex-col gap-0">
          <input
            className="w-full px-3 py-2 text-sm bg-layer border-none outline-none text-text-primary placeholder-text-placeholder"
            placeholder="Search customers\u2026"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderBottom: '1px solid var(--color-border-strong)' }}
          />
          <div className="overflow-x-auto border border-border-subtle">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-layer">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-subtle">Customer</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-subtle" style={{ width: 56 }}>Jobs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="cursor-pointer transition-colors hover:bg-layer-hover"
                    style={{ background: active?.id === c.id ? 'var(--color-layer-selected)' : undefined }}
                  >
                    <td className="px-3 py-2.5 border-b border-border-subtle">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={28} color={avatarColor(c.name)} />
                        <div>
                          <div className="font-medium leading-tight text-text-primary">{c.name}</div>
                          <div className="text-[11px] text-text-secondary">{c.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-border-subtle text-right text-text-secondary text-xs">
                      <span className="inline-flex items-center justify-end gap-1">
                        {jobCount(c.id)}
                        {active?.id === c.id && <ChevronRight size={12} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-text-helper text-sm">
                No customers match your search.
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        {active ? (
          <div className="flex flex-col gap-4">

            {/* Identity card */}
            <div className="bg-layer p-4">
              <div className="flex items-start gap-3.5 mb-4">
                <Avatar name={active.name} size={48} color={avatarColor(active.name)} />
                <div className="flex-1 min-w-0">
                  <h3 className="m-0 mb-0.5 text-base font-semibold text-text-primary">{active.name}</h3>
                  <div className="text-sm text-text-secondary">{active.address}</div>
                  {active.siteAddress && (
                    <div className="text-[11px] text-text-helper">Site: {active.siteAddress}</div>
                  )}
                </div>
                {onEditCustomer && (
                  <button
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-secondary bg-layer border border-border-subtle cursor-pointer hover:bg-layer-hover transition-colors rounded shrink-0"
                    onClick={() => onEditCustomer(active)}
                  >
                    <FileEdit size={14} /> Edit
                  </button>
                )}
              </div>

              {/* Contact + Portal */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <SectionTitle>Contact</SectionTitle>
                  <div className="flex flex-col gap-1">
                    <Row label="Phone" value={active.phone} />
                    <Row label="Email" value={active.email} />
                    {active.whatsapp && <Row label="WhatsApp" value={active.whatsapp} />}
                  </div>
                </div>
                <div>
                  <SectionTitle>Portal</SectionTitle>
                  <div className="flex flex-col gap-1">
                    <Row label="Code" value={active.portalCode ?? '\u2014'} mono />
                    <Row label="Status"
                      value={active.portalEnabled ? 'Enabled' : 'Disabled'}
                      valueColor={active.portalEnabled ? 'var(--color-support-success)' : 'var(--color-support-error)'}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap" style={{ marginBottom: compose ? 'var(--color-spacing-05, 16px)' : 0 }}>
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-none cursor-pointer transition-colors rounded ${compose === 'wa' ? 'bg-brand-600 text-white' : 'bg-support-success text-white'}`}
                  onClick={openWACompose}
                >
                  <MessageCircle size={16} /> WhatsApp {compose === 'wa' ? <X size={14} /> : null}
                </button>
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-none cursor-pointer transition-colors rounded ${compose === 'email' ? 'bg-brand-600 text-white' : 'bg-support-info text-white'}`}
                  onClick={openEmailCompose}
                >
                  <Mail size={16} /> Email {compose === 'email' ? <X size={14} /> : null}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-layer border border-border-subtle cursor-pointer hover:bg-layer-hover transition-colors rounded"
                  onClick={() => window.open(buildWA(active.whatsapp || active.phone, portalInviteText(active)), '_blank')}
                >
                  <Users size={16} /> Portal Invite
                </button>
              </div>

              {/* ── WhatsApp Compose Panel ── */}
              {compose === 'wa' && (
                <div className="animate-fade-in border-t border-border-subtle pt-4">
                  <p className="text-[11px] text-text-secondary mb-2 font-semibold">WHATSAPP COMPOSE</p>

                  {/* Template picker */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {([
                      { id: 'greeting', label: 'Greeting' },
                      { id: 'service-reminder', label: 'Service Reminder' },
                      { id: 'portal-invite', label: 'Portal Invite' },
                      { id: 'custom', label: 'Custom' },
                    ] as { id: WATemplate; label: string }[]).map(t => (
                      <button
                        key={t.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border-none cursor-pointer transition-colors rounded ${waTemplate === t.id ? 'bg-brand-600 text-white' : 'bg-layer text-text-secondary border border-border-subtle hover:bg-layer-hover'}`}
                        onClick={() => handleWATemplateChange(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="w-full px-3 py-2 text-sm bg-layer border border-border-subtle rounded outline-none text-text-primary resize-y mb-2.5"
                    rows={5}
                    value={waTemplate === 'custom' ? waMsg : buildWAMessage(active, waTemplate)}
                    onChange={e => { setWATemplate('custom'); setWAMsg(e.target.value); }}
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-text-helper">
                      Sending to: {active.whatsapp || active.phone}
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-support-success border-none cursor-pointer hover:bg-[#166331] transition-colors rounded"
                      onClick={launchWhatsApp}
                    >
                      <Send size={14} /> Open WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* ── Email Compose Panel ── */}
              {compose === 'email' && (
                <div className="animate-fade-in border-t border-border-subtle pt-4">
                  <p className="text-[11px] text-text-secondary mb-2 font-semibold">EMAIL COMPOSE</p>

                  {/* Template picker */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {([
                      { id: 'custom', label: 'Custom' },
                      { id: 'service-reminder', label: 'Service Reminder' },
                      { id: 'portal-invite', label: 'Portal Invite' },
                    ] as { id: EmailTemplate; label: string }[]).map(t => (
                      <button
                        key={t.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border-none cursor-pointer transition-colors rounded ${emailTemplate === t.id ? 'bg-brand-600 text-white' : 'bg-layer text-text-secondary border border-border-subtle hover:bg-layer-hover'}`}
                        onClick={() => handleEmailTemplateChange(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {emailTemplate === 'portal-invite' && (
                    <div className="mb-2.5">
                      {!active.portalCode ? (
                        <Notification
                          kind="w"
                          title="No portal code"
                          body="This customer doesn't have a portal code. Edit the customer record to add one before sending an invite."
                        />
                      ) : (
                        <Notification
                          kind="i"
                          title="Branded email"
                          body="Sends a professionally branded portal invite via Resend directly to the customer's inbox."
                        />
                      )}
                    </div>
                  )}

                  {emailTemplate !== 'portal-invite' && (
                    <input
                      className="w-full px-3 py-2 text-sm bg-layer border border-border-subtle rounded outline-none text-text-primary placeholder-text-placeholder mb-2"
                      placeholder="Subject"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                    />
                  )}

                  {emailTemplate !== 'portal-invite' && (
                    <textarea
                      className="w-full px-3 py-2 text-sm bg-layer border border-border-subtle rounded outline-none text-text-primary placeholder-text-placeholder resize-y mb-2.5"
                      rows={6}
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                    />
                  )}

                  {emailTemplate === 'portal-invite' && (
                    <div className="mb-2.5 text-sm text-text-secondary">
                      <Row label="To" value={active.email} />
                      <Row label="Code" value={active.portalCode ?? '(not set)'} mono />
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-text-helper">
                      {emailTemplate === 'portal-invite' ? 'Sends via Resend' : 'Opens in your email client'}
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-support-info border-none cursor-pointer hover:bg-blue-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendEmail}
                      disabled={emailSending || (emailTemplate === 'portal-invite' && !active.portalCode)}
                    >
                      {emailSending ? 'Sending\u2026' : <><CheckCheck size={14} /> {emailTemplate === 'portal-invite' ? 'Send Email' : 'Open Email'}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Service history */}
            <div>
              <SectionTitle>Service History ({customerJobs.length})</SectionTitle>
              <div className="overflow-x-auto border border-border-subtle">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-layer">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-subtle">Job</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-subtle">Date</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-subtle">Type</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-subtle">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerJobs.map(j => {
                      const tc = TYPE_CFG[j.type];
                      return (
                        <tr key={j.id} onClick={() => onJobClick(j)} className="cursor-pointer transition-colors hover:bg-layer-hover">
                          <td className="px-3 py-2.5 border-b border-border-subtle font-medium text-text-primary">{j.title}</td>
                          <td className="px-3 py-2.5 border-b border-border-subtle text-text-secondary whitespace-nowrap font-mono text-xs">{fmtDate(j.date)}</td>
                          <td className="px-3 py-2.5 border-b border-border-subtle"><span className="font-medium" style={{ color: tc?.color }}>{tc?.icon} {tc?.label}</span></td>
                          <td className="px-3 py-2.5 border-b border-border-subtle"><StatusTag status={j.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {customerJobs.length === 0 && (
                  <div className="p-6 text-center text-text-helper text-sm">
                    No jobs on record.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-layer p-8 text-center text-text-helper text-sm">
            Select a customer to view details.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div className="flex gap-1.5 text-sm">
      <span className="text-text-secondary shrink-0" style={{ minWidth: 60 }}>{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''} style={valueColor ? { color: valueColor } : {}}>{value}</span>
    </div>
  );
}
