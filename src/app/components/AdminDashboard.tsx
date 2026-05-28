'use client';

import React, { useState } from 'react';
import { Job, User, Customer, GasStockItem, GasUsageRecord } from '@/app/types';
import { TYPE_CFG, ALERT_CFG, TECH_STATUS } from '@/app/lib/config';
import { StatusTag, SectionTitle, Avatar } from './ui';
import { Email } from '@carbon/icons-react';

interface AdminDashboardProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  gasStock?: GasStockItem[];
  gasUsage?: GasUsageRecord[];
  onJobClick: (job: Job) => void;
  focus?: 'dashboard' | 'ops';
}

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

const GAS_RELEVANT_TYPES = new Set(['installation', 'maintenance', 'repair']);

function hasDiagnosticData(job: Job): boolean {
  if (!job.diagnostics) return false;
  return Object.values(job.diagnostics).some(value => value !== undefined && value !== null && String(value).trim() !== '');
}

function hasRecordedGas(job: Job, gasUsage: GasUsageRecord[]): boolean {
  if (gasUsage.some(record => record.jobId === job.id)) return true;
  const diag = job.diagnostics;
  return Boolean(diag?.refrigerantUsed || diag?.refrigerantRecovered || diag?.refrigerantReused);
}

function getCustomerName(customers: Customer[], customerId: string): string {
  return customers.find(c => c.id === customerId)?.name || 'Unknown customer';
}

function sortByDateDesc(a: Job, b: Job) {
  return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
}

export default function AdminDashboard({
  jobs,
  techs,
  customers,
  gasStock = [],
  gasUsage = [],
  onJobClick,
  focus = 'dashboard',
}: AdminDashboardProps) {
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; sent?: number; total?: number; error?: string } | null>(null);

  const todayJobs = jobs.filter(j => j.date === todayStr);
  const alertJobs = jobs.filter(j => j.alerts && j.alerts.length > 0 && j.status !== "completed");
  const unallocatedCount = jobs.filter(j => j.status === "unallocated").length;
  const jobsMissingClock = jobs
    .filter(j => j.status !== 'cancelled' && (!j.clockIn || (j.status === 'completed' && !j.clockOut)))
    .sort(sortByDateDesc);
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const completedMissingDiagnostics = completedJobs.filter(j => !hasDiagnosticData(j)).sort(sortByDateDesc);
  const completedMissingSignature = completedJobs.filter(j => !j.signature).sort(sortByDateDesc);
  const completedMissingGas = completedJobs
    .filter(j => GAS_RELEVANT_TYPES.has(j.type) && !hasRecordedGas(j, gasUsage))
    .sort(sortByDateDesc);
  const lowGasStock = gasStock
    .filter(item => {
      const lowByRatio = item.quantity > 0 && item.remaining / item.quantity <= 0.2;
      return item.remaining <= 2 || lowByRatio;
    })
    .sort((a, b) => a.remaining - b.remaining);
  const visibilityIssueCount =
    jobsMissingClock.length +
    completedMissingDiagnostics.length +
    completedMissingSignature.length +
    completedMissingGas.length +
    lowGasStock.length;

  const stats = [
    { label: "Total jobs", v: jobs.length },
    { label: "On site now", v: jobs.filter(j => j.status === "on-site").length },
    { label: "Scheduled", v: jobs.filter(j => j.status === "scheduled").length },
    { label: "Completed", v: jobs.filter(j => j.status === "completed").length },
  ];

  const sendAnnouncement = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/announce-big-fixes', { method: 'POST' });
      const data = await res.json();
      setSendResult(data);
    } catch (err: unknown) {
      setSendResult({ ok: false, error: err instanceof Error ? err.message : 'Failed to send announcement' });
    } finally {
      setSending(false);
    }
  };

  const renderJobIssueList = (items: Job[], emptyText: string, meta: (job: Job) => string) => (
    <div>
      {items.slice(0, focus === 'ops' ? 8 : 4).map(job => (
        <button
          key={job.id}
          type="button"
          className="tile tile-click"
          onClick={() => onJobClick(job)}
          style={{
            width: '100%',
            textAlign: 'left',
            marginBottom: 'var(--s2)',
            borderLeft: '3px solid var(--cds-support-warning)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 'var(--s1)' }}>{job.title}</p>
              <p style={{ fontSize: 13, color: 'var(--cds-text-secondary)' }}>
                {getCustomerName(customers, job.customerId)} · {job.date} · {job.time}
              </p>
              <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 'var(--s1)' }}>{meta(job)}</p>
            </div>
            <StatusTag status={job.status} />
          </div>
        </button>
      ))}
      {items.length === 0 && (
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: 13 }}>{emptyText}</p>
      )}
      {focus !== 'ops' && items.length > 4 && (
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: 12 }}>+{items.length - 4} more in Ops Visibility</p>
      )}
    </div>
  );

  const visibilityPanel = (
    <div style={{ marginBottom: 'var(--s6)' }}>
      <div className="page-hdr" style={{ marginBottom: 'var(--s4)', paddingBottom: 0 }}>
        <h1 style={focus === 'ops' ? undefined : { fontSize: 20 }}>Operational Visibility</h1>
        <p>Admin checks for missing field data, ODS readiness, and stock risk.</p>
      </div>

      <div className="g4" style={{ marginBottom: 'var(--s5)' }}>
        <div className="tile" style={{ borderTop: '3px solid var(--cds-support-warning)' }}>
          <div className="stat-v">{jobsMissingClock.length}</div>
          <div className="stat-l">Clock gaps</div>
        </div>
        <div className="tile" style={{ borderTop: '3px solid var(--cds-support-error)' }}>
          <div className="stat-v">{completedMissingGas.length}</div>
          <div className="stat-l">Gas gaps</div>
        </div>
        <div className="tile" style={{ borderTop: '3px solid #8a3ffc' }}>
          <div className="stat-v">{completedMissingDiagnostics.length + completedMissingSignature.length}</div>
          <div className="stat-l">Completion gaps</div>
        </div>
        <div className="tile" style={{ borderTop: '3px solid var(--cds-support-error)' }}>
          <div className="stat-v">{lowGasStock.length}</div>
          <div className="stat-l">Low gas stock</div>
        </div>
      </div>

      {visibilityIssueCount === 0 && (
        <div className="notif notif-s" style={{ marginBottom: 'var(--s5)' }}>
          <div>
            <div className="notif-title">Operational data looks complete</div>
            <div className="notif-body">No clock, completion, ODS, or low-stock gaps were found in the loaded data.</div>
          </div>
        </div>
      )}

      <div className="g2">
        <div className="tile">
          <SectionTitle>Jobs Missing Clock Data</SectionTitle>
          {renderJobIssueList(
            jobsMissingClock,
            'No active or completed jobs are missing clock data.',
            job => !job.clockIn ? 'Missing clock-in' : 'Completed without clock-out'
          )}
        </div>

        <div className="tile">
          <SectionTitle>Completed Jobs Missing ODS / Sign-off</SectionTitle>
          {renderJobIssueList(
            [...completedMissingGas, ...completedMissingDiagnostics, ...completedMissingSignature]
              .filter((job, index, list) => list.findIndex(item => item.id === job.id) === index)
              .sort(sortByDateDesc),
            'Completed jobs have gas, diagnostics, and signatures recorded where discoverable.',
            job => {
              const gaps = [
                completedMissingGas.some(j => j.id === job.id) ? 'gas usage' : '',
                completedMissingDiagnostics.some(j => j.id === job.id) ? 'diagnostics' : '',
                completedMissingSignature.some(j => j.id === job.id) ? 'signature' : '',
              ].filter(Boolean);
              return `Missing ${gaps.join(', ')}`;
            }
          )}
        </div>

        <div className="tile">
          <SectionTitle>Low Gas Stock</SectionTitle>
          {lowGasStock.slice(0, focus === 'ops' ? 10 : 5).map(item => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--s3)',
              padding: 'var(--s3) 0',
              borderBottom: '1px solid var(--cds-border-subtle)',
            }}>
              <div>
                <p style={{ fontWeight: 600 }}>{item.gasType} · {item.brand}</p>
                <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>{item.supplier || 'No supplier noted'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="mono" style={{ color: 'var(--cds-support-error)', fontWeight: 700 }}>
                  {item.remaining} {item.unit}
                </p>
                <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>of {item.quantity}</p>
              </div>
            </div>
          ))}
          {lowGasStock.length === 0 && (
            <p style={{ color: 'var(--cds-text-secondary)', fontSize: 13 }}>No gas stock is below the low-stock threshold.</p>
          )}
        </div>

        <div className="tile">
          <SectionTitle>Recent Fixes & Announcement</SectionTitle>
          <div className="notif notif-i" style={{ marginBottom: 'var(--s3)' }}>
            <div>
              <div className="notif-title">Big fixes announcement</div>
              <div className="notif-body">Send the latest data integrity and audit-trail update to admins and technicians.</div>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--cds-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
            <li>Gas usage, consumables, and audit records remain visible after user changes.</li>
            <li>Stock adjustments, customer updates, and user management actions are auditable.</li>
            <li>Completed jobs are checked here for diagnostics, gas, and signature gaps.</li>
          </ul>
          <button
            className="btn btn-p btn-sm"
            onClick={sendAnnouncement}
            disabled={sending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--s4)' }}
          >
            <Email size={16} />
            {sending ? 'Sending…' : 'Send Big Fixes Email'}
          </button>
        </div>
      </div>
    </div>
  );

  if (focus === 'ops') {
    return (
      <div className="fi-anim">
        {sendResult && (
          <div className={`notif ${sendResult.ok ? 'notif-s' : 'notif-e'}`} style={{ marginBottom: 'var(--s4)' }}>
            <div className="notif-title">{sendResult.ok ? 'Email Sent' : 'Failed to Send'}</div>
            <div className="notif-body">
              {sendResult.ok
                ? `Sent ${sendResult.sent} of ${sendResult.total} emails successfully.`
                : sendResult.error || 'An error occurred'}
            </div>
          </div>
        )}
        {visibilityPanel}
      </div>
    );
  }

  return (
    <div className="fi-anim">
      <div className="page-hdr" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Splash Air Conditioning — field operations overview</p>
        </div>
        <button
          className="btn btn-p btn-sm"
          onClick={sendAnnouncement}
          disabled={sending}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Email size={16} />
          {sending ? 'Sending…' : 'Send Big Fixes Email'}
        </button>
      </div>

      {sendResult && (
        <div className={`notif ${sendResult.ok ? 'notif-s' : 'notif-e'}`} style={{ marginBottom: 'var(--s4)' }}>
          <div className="notif-title">{sendResult.ok ? 'Email Sent' : 'Failed to Send'}</div>
          <div className="notif-body">
            {sendResult.ok
              ? `Sent ${sendResult.sent} of ${sendResult.total} emails successfully.`
              : sendResult.error || 'An error occurred'}
          </div>
        </div>
      )}

      {unallocatedCount > 0 && (
        <div 
          className="unalloc-badge" 
          onClick={() => {
            const unallocatedJob = jobs.find(j => j.status === "unallocated");
            if (unallocatedJob) onJobClick(unallocatedJob);
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--sw)" }}>
            {unallocatedCount} unallocated job{unallocatedCount !== 1 ? 's' : ''}
          </span>
          <span style={{ color: "var(--ts)", marginLeft: "var(--s3)" }}>
            Click to view
          </span>
        </div>
      )}
      
      {alertJobs.length > 0 && (
        <div style={{ marginBottom: "var(--s6)" }}>
          {alertJobs.map(j => (
            <div 
              key={j.id} 
              className="notif notif-e" 
              style={{ cursor: "pointer" }} 
              onClick={() => onJobClick(j)}
            >
              <div>
                <div className="notif-title">Active Alert — {j.title}</div>
                <div className="notif-body">
                  {j.alerts.map(a => ALERT_CFG[a]?.label).join(", ")} · {customers.find(c => c.id === j.customerId)?.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="g4" style={{ marginBottom: "var(--s6)" }}>
        {stats.map((s, i) => (
          <div key={i} className="tile" style={{ borderTop: "3px solid var(--bi)" }}>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.label}</div>
          </div>
        ))}
      </div>

      {visibilityPanel}

      <div className="g2">
        <div>
          <SectionTitle>Today&apos;s Jobs ({todayJobs.length})</SectionTitle>
          {todayJobs.length === 0 && (
            <div className="tile">
              <p style={{ color: "var(--ts)", fontSize: "14px" }}>
                No jobs scheduled for today.
              </p>
            </div>
          )}
          {todayJobs.map(j => {
            const cust = customers.find(c => c.id === j.customerId);
            const tech = techs.find(t => t.id === j.techIds[0]);
            const typeColor = TYPE_CFG[j.type]?.color || "#888";
            return (
              <div 
                key={j.id} 
                className="tile tile-click" 
                style={{ marginBottom: "var(--s2)", borderLeft: `3px solid ${typeColor}` }} 
                onClick={() => onJobClick(j)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: "var(--s1)" }}>{j.title}</p>
                    <p style={{ fontSize: "14px", color: "var(--ts)" }}>
                      {cust?.name} · {j.time}
                    </p>
                    {tech && (
                      <p style={{ fontSize: "12px", color: "var(--bi)", marginTop: "var(--s1)" }}>
                        {tech.name}
                      </p>
                    )}
                  </div>
                  <StatusTag status={j.status} />
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <SectionTitle>Technician Status</SectionTitle>
          {techs.map(t => {
            const onJob = jobs.find(j => j.techIds.includes(t.id) && (j.status === "on-site" || j.status === "in-progress"));
            const ts = TECH_STATUS[t.status || "available"] || TECH_STATUS.available;
            return (
              <div 
                key={t.id} 
                className="tile" 
                style={{ marginBottom: "var(--s2)", display: "flex", alignItems: "center", gap: "var(--s4)" }}
              >
                <Avatar name={t.name} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600 }}>{t.name}</p>
                  <p style={{ fontSize: "14px", color: "var(--ts)" }}>{t.specialty}</p>
                  {onJob ? (
                    <p style={{ fontSize: "12px", color: ts.color }}>{onJob.title}</p>
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--ss)" }}>Available</p>
                  )}
                </div>
                <span style={{ width: 8, height: 8, background: ts.color, display: "inline-block", flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
