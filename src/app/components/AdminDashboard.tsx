'use client';

import React, { useState } from 'react';
import { Job, User, Customer, GasStockItem, GasUsageRecord } from '@/app/types';
import { TYPE_CFG, ALERT_CFG, TECH_STATUS } from '@/app/lib/config';
import { StatusTag, SectionTitle, Avatar } from './ui';
import { Mail } from 'lucide-react';

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
          className="w-full text-left mb-2 p-3 bg-layer hover:bg-layer-hover cursor-pointer border-none border-l-4 border-l-support-warning transition-colors"
          onClick={() => onJobClick(job)}
        >
          <div className="flex justify-between gap-3 items-start">
            <div>
              <p className="font-semibold mb-1 text-text-primary">{job.title}</p>
              <p className="text-sm text-text-secondary">
                {getCustomerName(customers, job.customerId)} · {job.date} · {job.time}
              </p>
              <p className="text-xs text-text-secondary mt-1">{meta(job)}</p>
            </div>
            <StatusTag status={job.status} />
          </div>
        </button>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-text-secondary">{emptyText}</p>
      )}
      {focus !== 'ops' && items.length > 4 && (
        <p className="text-xs text-text-secondary">+{items.length - 4} more in Ops Visibility</p>
      )}
    </div>
  );

  const visibilityPanel = (
    <div className="mb-6">
      <div className="mb-4 pb-0">
        <h1 className={focus === 'ops' ? undefined : 'text-xl'} style={focus !== 'ops' ? undefined : {}}>Operational Visibility</h1>
        <p className="text-text-secondary text-sm">Admin checks for missing field data, ODS readiness, and stock risk.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-layer p-4 border-t-4 border-t-support-warning">
          <div className="text-3xl font-bold text-text-primary">{jobsMissingClock.length}</div>
          <div className="text-xs text-text-secondary mt-1">Clock gaps</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-support-error">
          <div className="text-3xl font-bold text-text-primary">{completedMissingGas.length}</div>
          <div className="text-xs text-text-secondary mt-1">Gas gaps</div>
        </div>
        <div className="bg-layer p-4 border-t-4" style={{ borderTopColor: '#8a3ffc' }}>
          <div className="text-3xl font-bold text-text-primary">{completedMissingDiagnostics.length + completedMissingSignature.length}</div>
          <div className="text-xs text-text-secondary mt-1">Completion gaps</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-support-error">
          <div className="text-3xl font-bold text-text-primary">{lowGasStock.length}</div>
          <div className="text-xs text-text-secondary mt-1">Low gas stock</div>
        </div>
      </div>

      {visibilityIssueCount === 0 && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-blue-50 border-l-4 border-l-support-info" role="status">
          <div>
            <div className="font-semibold text-sm text-text-primary">Operational data looks complete</div>
            <div className="text-sm text-text-secondary">No clock, completion, ODS, or low-stock gaps were found in the loaded data.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-layer p-4">
          <SectionTitle>Jobs Missing Clock Data</SectionTitle>
          {renderJobIssueList(
            jobsMissingClock,
            'No active or completed jobs are missing clock data.',
            job => !job.clockIn ? 'Missing clock-in' : 'Completed without clock-out'
          )}
        </div>

        <div className="bg-layer p-4">
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

        <div className="bg-layer p-4">
          <SectionTitle>Low Gas Stock</SectionTitle>
          {lowGasStock.slice(0, focus === 'ops' ? 10 : 5).map(item => (
            <div key={item.id} className="flex justify-between gap-3 py-3 border-b border-border-subtle">
              <div>
                <p className="font-semibold text-text-primary">{item.gasType} · {item.brand}</p>
                <p className="text-xs text-text-secondary">{item.supplier || 'No supplier noted'}</p>
              </div>
              <div className="text-right">
                <p className="mono text-support-error font-bold">{item.remaining} {item.unit}</p>
                <p className="text-xs text-text-secondary">of {item.quantity}</p>
              </div>
            </div>
          ))}
          {lowGasStock.length === 0 && (
            <p className="text-sm text-text-secondary">No gas stock is below the low-stock threshold.</p>
          )}
        </div>

        <div className="bg-layer p-4">
          <SectionTitle>Recent Fixes & Announcement</SectionTitle>
          <div className="flex items-start gap-3 p-4 mb-3 bg-blue-50 border-l-4 border-l-support-info">
            <div>
              <div className="font-semibold text-sm text-text-primary">Big fixes announcement</div>
              <div className="text-sm text-text-secondary">Send the latest data integrity and audit-trail update to admins and technicians.</div>
            </div>
          </div>
          <ul className="m-0 pl-[18px] text-sm text-text-secondary leading-relaxed">
            <li>Gas usage, consumables, and audit records remain visible after user changes.</li>
            <li>Stock adjustments, customer updates, and user management actions are auditable.</li>
            <li>Completed jobs are checked here for diagnostics, gas, and signature gaps.</li>
          </ul>
          <button
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover active:bg-interactive-active transition-colors"
            onClick={sendAnnouncement}
            disabled={sending}
          >
            <Mail size={16} />
            {sending ? 'Sending…' : 'Send Big Fixes Email'}
          </button>
        </div>
      </div>
    </div>
  );

  if (focus === 'ops') {
    return (
      <div className="animate-fade-in">
        {sendResult && (
          <div className={`flex items-start gap-3 p-4 mb-4 border-l-4 ${sendResult.ok ? 'bg-green-50 border-l-support-success' : 'bg-red-50 border-l-support-error'}`}>
            <div className="text-sm">
              <div className="font-semibold text-text-primary">{sendResult.ok ? 'Email Sent' : 'Failed to Send'}</div>
              <div className="text-text-secondary">
                {sendResult.ok
                  ? `Sent ${sendResult.sent} of ${sendResult.total} emails successfully.`
                  : sendResult.error || 'An error occurred'}
              </div>
            </div>
          </div>
        )}
        {visibilityPanel}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">Splash Air Conditioning — field operations overview</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover active:bg-interactive-active transition-colors"
          onClick={sendAnnouncement}
          disabled={sending}
        >
          <Mail size={16} />
          {sending ? 'Sending…' : 'Send Big Fixes Email'}
        </button>
      </div>

      {sendResult && (
        <div className={`flex items-start gap-3 p-4 mb-4 border-l-4 ${sendResult.ok ? 'bg-green-50 border-l-support-success' : 'bg-red-50 border-l-support-error'}`}>
          <div className="text-sm">
            <div className="font-semibold text-text-primary">{sendResult.ok ? 'Email Sent' : 'Failed to Send'}</div>
            <div className="text-text-secondary">
              {sendResult.ok
                ? `Sent ${sendResult.sent} of ${sendResult.total} emails successfully.`
                : sendResult.error || 'An error occurred'}
            </div>
          </div>
        </div>
      )}

      {unallocatedCount > 0 && (
        <div 
          className="flex items-center gap-3 p-4 mb-6 bg-amber-50 border-l-4 border-l-support-warning cursor-pointer"
          onClick={() => {
            const unallocatedJob = jobs.find(j => j.status === "unallocated");
            if (unallocatedJob) onJobClick(unallocatedJob);
          }}
        >
          <span className="font-semibold text-[#b28600]">
            {unallocatedCount} unallocated job{unallocatedCount !== 1 ? 's' : ''}
          </span>
          <span className="text-text-secondary ml-3">Click to view</span>
        </div>
      )}
      
      {alertJobs.length > 0 && (
        <div className="mb-6">
          {alertJobs.map(j => (
            <div 
              key={j.id} 
              className="flex items-start gap-3 p-4 mb-1 bg-red-50 border-l-4 border-l-support-error cursor-pointer"
              onClick={() => onJobClick(j)}
            >
              <div>
                <div className="font-semibold text-sm text-text-primary">Active Alert — {j.title}</div>
                <div className="text-sm text-text-secondary">
                  {j.alerts.map(a => ALERT_CFG[a]?.label).join(", ")} · {customers.find(c => c.id === j.customerId)?.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-layer p-4 border-t-4" style={{ borderTopColor: 'var(--color-interactive)' }}>
            <div className="text-3xl font-bold text-text-primary">{s.v}</div>
            <div className="text-xs text-text-secondary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {visibilityPanel}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <SectionTitle>Today&apos;s Jobs ({todayJobs.length})</SectionTitle>
          {todayJobs.length === 0 && (
            <div className="bg-layer p-4">
              <p className="text-sm text-text-secondary">No jobs scheduled for today.</p>
            </div>
          )}
          {todayJobs.map(j => {
            const cust = customers.find(c => c.id === j.customerId);
            const tech = techs.find(t => t.id === j.techIds[0]);
            const typeColor = TYPE_CFG[j.type]?.color || "#888";
            return (
              <div 
                key={j.id} 
                className="bg-layer p-3 mb-2 border-l-4 cursor-pointer hover:bg-layer-hover transition-colors"
                style={{ borderLeftColor: typeColor }}
                onClick={() => onJobClick(j)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold mb-1 text-text-primary">{j.title}</p>
                    <p className="text-sm text-text-secondary">
                      {cust?.name} · {j.time}
                    </p>
                    {tech && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-interactive)' }}>
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
                className="bg-layer p-4 mb-2 flex items-center gap-4"
              >
                <Avatar name={t.name} />
                <div className="flex-1">
                  <p className="font-semibold text-text-primary">{t.name}</p>
                  <p className="text-sm text-text-secondary">{t.specialty}</p>
                  {onJob ? (
                    <p className="text-xs" style={{ color: ts.color }}>{onJob.title}</p>
                  ) : (
                    <p className="text-xs text-support-success">Available</p>
                  )}
                </div>
                <span className="w-2 h-2 shrink-0 block" style={{ background: ts.color }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
