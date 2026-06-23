'use client';

import React, { useState } from 'react';
import { Job, User, Customer, JobStatus, JobType, GasUsageRecord } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, ALERT_CFG } from '@/app/lib/config';
import { getGasUsageWarning } from '@/app/lib/gasUsageWarning';
import { StatusTag, PrioTag } from './ui';
import { Plus, AlertTriangle } from 'lucide-react';
import { canViewAllJobs, canManageJobs } from '@/app/lib/permissions';

interface JobsTableProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  currentUser: User;
  gasUsage?: GasUsageRecord[];
  onJobClick: (job: Job) => void;
  onAddJob?: () => void;
}

export default function JobsTable({ jobs, techs, customers, currentUser, gasUsage = [], onJobClick, onAddJob }: JobsTableProps) {
  const userRole = currentUser.role;
  const [sf, setSF] = useState<JobStatus | "all">("all");
  const [tf, setTF] = useState<JobType | "all">("all");
  const [q, setQ] = useState("");
  
  const base = canViewAllJobs(userRole) ? jobs : jobs.filter(j => j.techIds.includes(currentUser.id));
  const rows = base.filter(j => {
    if (sf !== "all" && j.status !== sf) return false;
    if (tf !== "all" && j.type !== tf) return false;
    if (q) {
      const c = customers.find(x => x.id === j.customerId);
      return j.title.toLowerCase().includes(q.toLowerCase()) || (c && c.name.toLowerCase().includes(q.toLowerCase()));
    }
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{canViewAllJobs(userRole) ? "All Jobs" : "My Jobs"}</h1>
          <p className="text-sm text-text-secondary">{rows.length} records</p>
        </div>
        {canManageJobs(userRole) && onAddJob && (
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover active:bg-interactive-active transition-colors"
            onClick={onAddJob}
          >
            <Plus size={16} />
            Add Job
          </button>
        )}
      </div>

      <div className="flex gap-0 mb-4 flex-wrap">
        <input 
          className="w-[220px] h-9 px-3 text-sm text-text-primary bg-layer border border-border-strong outline-none transition-colors focus:border-interactive focus:shadow-[0_0_0_2px_rgba(0,105,92,0.2)]"
          style={{ borderRight: "none" }}
          placeholder="Search jobs..." 
          value={q} 
          onChange={e => setQ(e.target.value)} 
        />
        <select 
          className="w-[180px] h-9 px-3 text-sm text-text-primary bg-layer border border-border-strong outline-none transition-colors focus:border-interactive"
          style={{ borderRight: "none" }}
          value={sf} 
          onChange={e => setSF(e.target.value as JobStatus | "all")}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select 
          className="w-[160px] h-9 px-3 text-sm text-text-primary bg-layer border border-border-strong outline-none transition-colors focus:border-interactive"
          value={tf} 
          onChange={e => setTF(e.target.value as JobType | "all")}
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface">
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Job ID</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Title</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Customer</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Date</th>
              {canViewAllJobs(userRole) && <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Lead Tech</th>}
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Type</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Priority</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Status</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Alerts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(j => {
              const cust = customers.find(c => c.id === j.customerId);
              const tech = techs.find(t => t.id === j.techIds[0]);
              const typeConfig = TYPE_CFG[j.type];
              return (
                <tr key={j.id} onClick={() => onJobClick(j)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                  <td className="mono text-xs text-text-secondary px-4 py-3 border-b border-border-subtle">{j.id}</td>
                  <td className="font-medium text-text-primary px-4 py-3 border-b border-border-subtle">{j.title}</td>
                  <td className="text-sm text-text-secondary px-4 py-3 border-b border-border-subtle">{cust?.name}</td>
                  <td className="mono text-xs text-text-secondary whitespace-nowrap px-4 py-3 border-b border-border-subtle">
                    {j.date}<br/>{j.time}
                  </td>
                  {canViewAllJobs(userRole) && <td className="text-sm text-text-secondary px-4 py-3 border-b border-border-subtle">{tech?.name || "—"}</td>}
                  <td className="px-4 py-3 border-b border-border-subtle">
                    <span style={{ color: typeConfig?.color }} className="font-medium text-sm">
                      {typeConfig?.icon} {typeConfig?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-border-subtle"><PrioTag p={j.priority} /></td>
                  <td className="px-4 py-3 border-b border-border-subtle"><StatusTag status={j.status} /></td>
                  <td className="text-base px-4 py-3 border-b border-border-subtle">
                    {(j.alerts || []).map(a => (
                      <span key={a} title={ALERT_CFG[a]?.label}>{ALERT_CFG[a]?.icon}</span>
                    ))}
                    {(() => {
                      const warn = getGasUsageWarning(j, gasUsage, j.id);
                      if (!warn) return null;
                      const color = warn.level === 'overdue' ? '#da1e28' : '#f1c21b';
                      return (
                        <span
                          className="inline-flex align-middle ml-1"
                          style={{ color }}
                          title={warn.message}
                        >
                          <AlertTriangle size={16} />
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-10 text-center text-text-helper text-sm">
            No jobs match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
