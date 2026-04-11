'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Job } from '@/app/types';
import { TYPE_CFG } from '@/app/lib/config';
import { buildWA, buildMail, portalInviteText, fmtDate } from '@/app/lib/utils';
import { sendPortalInviteEmail } from '@/app/lib/email/client';
import { StatusTag, SectionTitle, Avatar, Notification } from './ui';
import { Add, Edit, Chat, Email, UserMultiple, ChevronRight, Close, Send, CheckmarkFilled } from '@carbon/icons-react';

interface CustomerDBProps {
  customers: Customer[];
  jobs: Job[];
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

export default function CustomerDB({ customers, jobs, onJobClick, onEditCustomer, onAddCustomer }: CustomerDBProps) {
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
    <div className="fi-anim">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, minWidth: 280, maxWidth: 360 }}>
          <Notification kind={toast.kind} title={toast.kind === 's' ? 'Sent' : 'Error'} body={toast.msg} />
        </div>
      )}

      {/* Header */}
      <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Customers</h1>
          <p>{filtered.length} records</p>
        </div>
        {onAddCustomer && (
          <button className="btn btn-p btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openEmpty}>
            <Add size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--cds-spacing-05)', alignItems: 'start' }}>

        {/* ── Left panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <input
            className="inp"
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderBottom: '1px solid var(--cds-border-strong-01)' }}
          />
          <div className="tbl-wrap" style={{ marginBottom: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th style={{ width: 56, textAlign: 'right' }}>Jobs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c)}
                    style={{ cursor: 'pointer', background: active?.id === c.id ? 'var(--cds-layer-selected-01)' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} size={28} color={avatarColor(c.name)} />
                        <div>
                          <div style={{ fontWeight: 500, lineHeight: 1.2 }}>{c.name}</div>
                          <div style={{ fontSize: 'var(--cds-label-01)', color: 'var(--cds-text-secondary)' }}>{c.address}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--cds-text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        {jobCount(c.id)}
                        {active?.id === c.id && <ChevronRight size={12} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 'var(--cds-spacing-08)', textAlign: 'center', color: 'var(--cds-text-helper)' }}>
                No customers match your search.
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        {active ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cds-spacing-05)' }}>

            {/* Identity card */}
            <div className="tile">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 'var(--cds-spacing-05)' }}>
                <Avatar name={active.name} size={48} color={avatarColor(active.name)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 2px' }}>{active.name}</h3>
                  <div style={{ color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-body-short-01-font-size)' }}>{active.address}</div>
                  {active.siteAddress && (
                    <div style={{ color: 'var(--cds-text-helper)', fontSize: 'var(--cds-label-01)' }}>Site: {active.siteAddress}</div>
                  )}
                </div>
                {onEditCustomer && (
                  <button className="btn btn-s btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={() => onEditCustomer(active)}>
                    <Edit size={14} /> Edit
                  </button>
                )}
              </div>

              {/* Contact + Portal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--cds-spacing-05)', marginBottom: 'var(--cds-spacing-05)' }}>
                <div>
                  <SectionTitle>Contact</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Row label="Phone" value={active.phone} />
                    <Row label="Email" value={active.email} />
                    {active.whatsapp && <Row label="WhatsApp" value={active.whatsapp} />}
                  </div>
                </div>
                <div>
                  <SectionTitle>Portal</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Row label="Code" value={active.portalCode ?? '—'} mono />
                    <Row label="Status"
                      value={active.portalEnabled ? 'Enabled' : 'Disabled'}
                      valueColor={active.portalEnabled ? 'var(--cds-support-success)' : 'var(--cds-support-error)'}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: compose ? 'var(--cds-spacing-05)' : 0 }}>
                <button
                  className={`btn btn-sm ${compose === 'wa' ? 'btn-p' : 'btn-wa'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={openWACompose}
                >
                  <Chat size={16} /> WhatsApp {compose === 'wa' ? <Close size={14} /> : null}
                </button>
                <button
                  className={`btn btn-sm ${compose === 'email' ? 'btn-p' : 'btn-mail'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={openEmailCompose}
                >
                  <Email size={16} /> Email {compose === 'email' ? <Close size={14} /> : null}
                </button>
                <button className="btn btn-s btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.open(buildWA(active.whatsapp || active.phone, portalInviteText(active)), '_blank')}>
                  <UserMultiple size={16} /> Portal Invite
                </button>
              </div>

              {/* ── WhatsApp Compose Panel ── */}
              {compose === 'wa' && (
                <div className="fi-anim" style={{ borderTop: '1px solid var(--cds-border-subtle-01)', paddingTop: 'var(--cds-spacing-05)' }}>
                  <p style={{ fontSize: 'var(--cds-label-01)', color: 'var(--cds-text-secondary)', marginBottom: 8 }}>WHATSAPP COMPOSE</p>

                  {/* Template picker */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {([
                      { id: 'greeting', label: 'Greeting' },
                      { id: 'service-reminder', label: 'Service Reminder' },
                      { id: 'portal-invite', label: 'Portal Invite' },
                      { id: 'custom', label: 'Custom' },
                    ] as { id: WATemplate; label: string }[]).map(t => (
                      <button
                        key={t.id}
                        className={`btn btn-sm ${waTemplate === t.id ? 'btn-p' : 'btn-s'}`}
                        onClick={() => handleWATemplateChange(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="ta"
                    rows={5}
                    value={waTemplate === 'custom' ? waMsg : buildWAMessage(active, waTemplate)}
                    onChange={e => { setWATemplate('custom'); setWAMsg(e.target.value); }}
                    style={{ marginBottom: 10 }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--cds-label-01)', color: 'var(--cds-text-helper)' }}>
                      Sending to: {active.whatsapp || active.phone}
                    </span>
                    <button className="btn btn-wa btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={launchWhatsApp}>
                      <Send size={14} /> Open WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* ── Email Compose Panel ── */}
              {compose === 'email' && (
                <div className="fi-anim" style={{ borderTop: '1px solid var(--cds-border-subtle-01)', paddingTop: 'var(--cds-spacing-05)' }}>
                  <p style={{ fontSize: 'var(--cds-label-01)', color: 'var(--cds-text-secondary)', marginBottom: 8 }}>EMAIL COMPOSE</p>

                  {/* Template picker */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {([
                      { id: 'custom', label: 'Custom' },
                      { id: 'service-reminder', label: 'Service Reminder' },
                      { id: 'portal-invite', label: 'Portal Invite' },
                    ] as { id: EmailTemplate; label: string }[]).map(t => (
                      <button
                        key={t.id}
                        className={`btn btn-sm ${emailTemplate === t.id ? 'btn-p' : 'btn-s'}`}
                        onClick={() => handleEmailTemplateChange(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {emailTemplate === 'portal-invite' && (
                    <div style={{ marginBottom: 10 }}>
                      <Notification
                        kind="i"
                        title="Branded email"
                        body="This will send a professionally branded portal invite via Resend directly to the customer's inbox."
                      />
                    </div>
                  )}

                  {emailTemplate !== 'portal-invite' && (
                    <input
                      className="inp"
                      placeholder="Subject"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                  )}

                  {emailTemplate !== 'portal-invite' && (
                    <textarea
                      className="ta"
                      rows={6}
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      style={{ marginBottom: 10 }}
                    />
                  )}

                  {emailTemplate === 'portal-invite' && (
                    <div style={{ marginBottom: 10, fontSize: 'var(--cds-body-short-01-font-size)', color: 'var(--cds-text-secondary)' }}>
                      <Row label="To" value={active.email} />
                      <Row label="Code" value={active.portalCode ?? '(not set)'} mono />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--cds-label-01)', color: 'var(--cds-text-helper)' }}>
                      {emailTemplate === 'portal-invite' ? 'Sends via Resend' : 'Opens in your email client'}
                    </span>
                    <button
                      className="btn btn-mail btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={sendEmail}
                      disabled={emailSending}
                    >
                      {emailSending ? 'Sending…' : <><CheckmarkFilled size={14} /> {emailTemplate === 'portal-invite' ? 'Send Email' : 'Open Email'}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Service history */}
            <div>
              <SectionTitle>Service History ({customerJobs.length})</SectionTitle>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerJobs.map(j => {
                      const tc = TYPE_CFG[j.type];
                      return (
                        <tr key={j.id} onClick={() => onJobClick(j)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 500 }}>{j.title}</td>
                          <td className="mono" style={{ color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(j.date)}</td>
                          <td><span style={{ color: tc?.color, fontWeight: 500 }}>{tc?.icon} {tc?.label}</span></td>
                          <td><StatusTag status={j.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {customerJobs.length === 0 && (
                  <div style={{ padding: 'var(--cds-spacing-07)', textAlign: 'center', color: 'var(--cds-text-helper)' }}>
                    No jobs on record.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="tile" style={{ textAlign: 'center', padding: 'var(--cds-spacing-10)', color: 'var(--cds-text-helper)' }}>
            Select a customer to view details.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: 'var(--cds-body-short-01-font-size)' }}>
      <span style={{ color: 'var(--cds-text-secondary)', minWidth: 60, flexShrink: 0 }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={valueColor ? { color: valueColor } : {}}>{value}</span>
    </div>
  );
}
