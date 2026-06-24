'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Job, User } from '@/app/types';
import { TYPE_CFG } from '@/app/lib/config';
import { canManageCustomers } from '@/app/lib/permissions';
import { buildWA, buildMail, portalInviteText, fmtDate } from '@/app/lib/utils';
import { sendPortalInviteEmail } from '@/app/lib/email/client';
import { StatusTag, SectionTitle, Avatar, Notification } from './ui';
import { Plus, FileEdit, MessageCircle, Mail, Users, ChevronRight, X, Send, CheckCheck, Search, Phone, Briefcase } from 'lucide-react';

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

function getActiveJobCount(customerId: string, jobs: Job[]): number {
  return jobs.filter(j => j.customerId === customerId && j.status !== 'completed' && j.status !== 'cancelled').length;
}

export default function CustomerDB({ customers, jobs, currentUser, onJobClick, onEditCustomer, onAddCustomer }: CustomerDBProps) {
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
        // Send via Resend instead of opening mail client
        const res = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: active.email,
            subject: emailSubject,
            body: emailBody,
            customerName: active.name,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setToast({ kind: 's', msg: `Email sent to ${active.email}` });
          setCompose(null);
        } else {
          setToast({ kind: 'e', msg: data.error || 'Failed to send email' });
        }
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
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] min-w-[280px] max-w-[360px]">
          <Notification kind={toast.kind} title={toast.kind === 's' ? 'Sent' : 'Error'} body={toast.msg} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} records</p>
        </div>
        {onAddCustomer && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all duration-200 border-none cursor-pointer"
            onClick={openEmpty}
          >
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 placeholder-gray-400"
            placeholder="Search by name, address, phone, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: '360px 1fr' }}>

        {/* ── Left panel: Customer cards ── */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-12 text-gray-400">
              <Search size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500">No customers found.</p>
            </div>
          ) : (
            filtered.map(c => {
              const activeJobs = getActiveJobCount(c.id, jobs);
              const accentColor = activeJobs > 0 ? '#f59e0b' : '#10b981';
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`bg-white rounded-lg border p-4 hover:border-gray-200 hover:shadow-sm cursor-pointer transition-all duration-200 ${
                    active?.id === c.id ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1 self-stretch rounded-full shrink-0`} style={{ background: accentColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={c.name} size={28} color={avatarColor(c.name)} />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 leading-tight">{c.name}</p>
                          <p className="text-xs text-gray-500 leading-tight truncate">{c.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} />
                          {c.phone}
                        </span>
                        {jobCount(c.id) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase size={12} />
                            {jobCount(c.id)} job{jobCount(c.id) !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <a
                          href={buildWA(c.whatsapp || c.phone, `Hi ${c.name}, `)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          onClick={e => e.stopPropagation()}
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          onClick={e => e.stopPropagation()}
                          title="Email"
                        >
                          <Mail size={14} />
                        </a>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 mt-1 shrink-0" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Right panel ── */}
        {active ? (
          <div className="space-y-5">

            {/* Identity card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-4 mb-5">
                <Avatar name={active.name} size={48} color={avatarColor(active.name)} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">{active.name}</h3>
                  <p className="text-sm text-gray-500">{active.address}</p>
                  {active.siteAddress && (
                    <p className="text-xs text-gray-400 mt-0.5">Site: {active.siteAddress}</p>
                  )}
                </div>
                {onEditCustomer && (
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                    onClick={() => onEditCustomer(active)}
                  >
                    <FileEdit size={14} /> Edit
                  </button>
                )}
              </div>

              {/* Contact + Portal grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-gray-400 shrink-0" />
                      <span className="text-gray-600">{active.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-gray-400 shrink-0" />
                      <span className="text-gray-600">{active.email}</span>
                    </div>
                    {active.whatsapp && (
                      <div className="flex items-center gap-2 text-sm">
                        <MessageCircle size={14} className="text-gray-400 shrink-0" />
                        <span className="text-gray-600">{active.whatsapp}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Portal</p>
                  <div className="space-y-2">
                    <Row label="Code" value={active.portalCode ?? '\u2014'} mono />
                    <Row label="Status"
                      value={active.portalEnabled ? 'Enabled' : 'Disabled'}
                      valueColor={active.portalEnabled ? '#10b981' : '#ef4444'}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap" style={{ marginBottom: compose ? '16px' : 0 }}>
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-none cursor-pointer transition-all duration-200 ${
                    compose === 'wa'
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  onClick={openWACompose}
                >
                  <MessageCircle size={15} /> WhatsApp {compose === 'wa' ? <X size={14} /> : null}
                </button>
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-none cursor-pointer transition-all duration-200 ${
                    compose === 'email'
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                  onClick={openEmailCompose}
                >
                  <Mail size={15} /> Email {compose === 'email' ? <X size={14} /> : null}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.open(buildWA(active.whatsapp || active.phone, portalInviteText(active)), '_blank')}
                >
                  <Users size={15} /> Portal Invite
                </button>
              </div>

              {/* ── WhatsApp Compose Panel ── */}
              {compose === 'wa' && (
                <div className="border-t border-gray-100 pt-4 animate-fade-in">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">WHATSAPP COMPOSE</p>

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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border-none cursor-pointer transition-all ${
                          waTemplate === t.id
                            ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleWATemplateChange(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none text-gray-900 resize-y mb-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    rows={5}
                    value={waTemplate === 'custom' ? waMsg : buildWAMessage(active, waTemplate)}
                    onChange={e => { setWATemplate('custom'); setWAMsg(e.target.value); }}
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Sending to: {active.whatsapp || active.phone}
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
                      onClick={launchWhatsApp}
                    >
                      <Send size={14} /> Open WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* ── Email Compose Panel ── */}
              {compose === 'email' && (
                <div className="border-t border-gray-100 pt-4 animate-fade-in">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">EMAIL COMPOSE</p>

                  {/* Template picker */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {([
                      { id: 'custom', label: 'Custom' },
                      { id: 'service-reminder', label: 'Service Reminder' },
                      { id: 'portal-invite', label: 'Portal Invite' },
                    ] as { id: EmailTemplate; label: string }[]).map(t => (
                      <button
                        key={t.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border-none cursor-pointer transition-all ${
                          emailTemplate === t.id
                            ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleEmailTemplateChange(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {emailTemplate === 'portal-invite' && (
                    <div className="mb-3">
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
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none text-gray-900 placeholder-gray-400 mb-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="Subject"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                    />
                  )}

                  {emailTemplate !== 'portal-invite' && (
                    <textarea
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none text-gray-900 placeholder-gray-400 resize-y mb-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      rows={6}
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                    />
                  )}

                  {emailTemplate === 'portal-invite' && (
                    <div className="mb-3 text-sm text-gray-600 space-y-1">
                      <Row label="To" value={active.email} />
                      <Row label="Code" value={active.portalCode ?? '(not set)'} mono />
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {emailSending ? 'Sending...' : 'Sent via Resend'}
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendEmail}
                      disabled={emailSending || (emailTemplate === 'portal-invite' && !active.portalCode)}
                    >
                      {emailSending ? 'Sending\u2026' : <><CheckCheck size={14} /> Send Email</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Service history */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Service History ({customerJobs.length})</p>
              {customerJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Briefcase size={36} className="mb-3 opacity-30" />
                  <p className="text-sm text-gray-500">No jobs on record.</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100">Job</th>
                        <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100">Date</th>
                        <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100">Type</th>
                        <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerJobs.map(j => {
                        const tc = TYPE_CFG[j.type];
                        return (
                          <tr key={j.id} onClick={() => onJobClick(j)} className="cursor-pointer hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-3 py-2.5 border-b border-gray-100 font-medium text-sm text-gray-900">{j.title}</td>
                            <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500 whitespace-nowrap font-mono text-xs">{fmtDate(j.date)}</td>
                            <td className="px-3 py-2.5 border-b border-gray-100">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-700">
                                <span style={{ color: tc?.color }}>{tc?.icon}</span>
                                {tc?.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 border-b border-gray-100"><StatusTag status={j.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium text-gray-500">Select a customer to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 shrink-0" style={{ minWidth: 60 }}>{label}</span>
      <span className={mono ? 'font-mono text-xs text-gray-600' : 'text-gray-600'} style={valueColor ? { color: valueColor } : {}}>{value}</span>
    </div>
  );
}
