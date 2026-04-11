'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Job } from '@/app/types';
import { TYPE_CFG } from '@/app/lib/config';
import { buildWA, buildMail, portalInviteText, fmtDate } from '@/app/lib/utils';
import { StatusTag, SectionTitle, Avatar } from './ui';
import {
  Add,
  Edit,
  Chat,
  Email,
  UserMultiple,
  ChevronRight,
} from '@carbon/icons-react';

interface CustomerDBProps {
  customers: Customer[];
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onEditCustomer?: (customer: Customer) => void;
  onAddCustomer?: (customer: Customer) => void;
}

const AVATAR_COLORS = [
  '#0f62fe', '#198038', '#9f1853', '#6929c4',
  '#005d5d', '#8a3800', '#003a6d',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function CustomerDB({ customers, jobs, onJobClick, onEditCustomer, onAddCustomer }: CustomerDBProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

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

  const openEmpty = () => onAddCustomer?.({ id: '', name: '', address: '', siteAddress: '', phone: '', whatsapp: '', email: '', portalCode: '', portalEnabled: false });

  return (
    <div className="fi-anim">
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

        {/* ── Left panel: search + list ── */}
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
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{
                      cursor: 'pointer',
                      background: active?.id === c.id ? 'var(--cds-layer-selected-01)' : undefined,
                    }}
                  >
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

        {/* ── Right panel: detail ── */}
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
                    <div style={{ color: 'var(--cds-text-helper)', fontSize: 'var(--cds-label-01)' }}>
                      Site: {active.siteAddress}
                    </div>
                  )}
                </div>
                {onEditCustomer && (
                  <button className="btn btn-s btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={() => onEditCustomer(active)}>
                    <Edit size={14} /> Edit
                  </button>
                )}
              </div>

              {/* Contact + Portal row */}
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
                    <Row
                      label="Status"
                      value={active.portalEnabled ? 'Enabled' : 'Disabled'}
                      valueColor={active.portalEnabled ? 'var(--cds-support-success)' : 'var(--cds-support-error)'}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-wa" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.open(buildWA(active.whatsapp || active.phone, `Hi ${active.name},`), '_blank')}>
                  <Chat size={16} /> WhatsApp
                </button>
                <button className="btn btn-mail" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.open(buildMail(active.email, 'Splash Air - Service Update', `Dear ${active.name},\n\n`), '_blank')}>
                  <Email size={16} /> Email
                </button>
                <button className="btn btn-s" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.open(buildWA(active.whatsapp || active.phone, portalInviteText(active)), '_blank')}>
                  <UserMultiple size={16} /> Portal Invite
                </button>
              </div>
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
                          <td className="mono" style={{ color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }}>
                            {fmtDate(j.date)}
                          </td>
                          <td>
                            <span style={{ color: tc?.color, fontWeight: 500 }}>{tc?.icon} {tc?.label}</span>
                          </td>
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
