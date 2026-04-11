'use client';

import React, { useState } from 'react';
import { Job, User, Customer, JobStatus, JobType } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, ALERT_CFG } from '@/app/lib/config';
import { StatusTag, PrioTag } from './ui';
import { Add } from '@carbon/icons-react';

interface JobsTableProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  currentUser: User;
  onJobClick: (job: Job) => void;
  onAddJob?: () => void;
}

export default function JobsTable({ jobs, techs, customers, currentUser, onJobClick, onAddJob }: JobsTableProps) {
  const isAdmin = currentUser.role === "admin";
  const [sf, setSF] = useState<JobStatus | "all">("all");
  const [tf, setTF] = useState<JobType | "all">("all");
  const [q, setQ] = useState("");
  
  const base = isAdmin ? jobs : jobs.filter(j => j.techIds.includes(currentUser.id));
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
    <div className="fi-anim">
      <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>{isAdmin ? "All Jobs" : "My Jobs"}</h1>
          <p>{rows.length} records</p>
        </div>
        {isAdmin && onAddJob && (
          <button
            className="btn btn-p btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={onAddJob}
          >
            <Add size={16} />
            Add Job
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: "var(--cds-spacing-05)", flexWrap: "wrap" }}>
        <input 
          className="inp" 
          style={{ width: 220, borderBottom: "none", borderRight: "1px solid var(--cds-border-strong-01)" }} 
          placeholder="Search jobs..." 
          value={q} 
          onChange={e => setQ(e.target.value)} 
        />
        <select 
          className="sel" 
          style={{ width: 180, borderBottom: "none", borderRight: "1px solid var(--cds-border-strong-01)" }} 
          value={sf} 
          onChange={e => setSF(e.target.value as JobStatus | "all")}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select 
          className="sel" 
          style={{ width: 160, borderBottom: "none" }} 
          value={tf} 
          onChange={e => setTF(e.target.value as JobType | "all")}
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Date</th>
              {isAdmin && <th>Lead Tech</th>}
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Alerts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(j => {
              const cust = customers.find(c => c.id === j.customerId);
              const tech = techs.find(t => t.id === j.techIds[0]);
              const typeConfig = TYPE_CFG[j.type];
              return (
                <tr key={j.id} onClick={() => onJobClick(j)}>
                  <td className="mono" style={{ color: "var(--cds-text-secondary)", fontSize: "var(--cds-label-01)" }}>{j.id}</td>
                  <td style={{ fontWeight: 500 }}>{j.title}</td>
                  <td style={{ color: "var(--cds-text-secondary)" }}>{cust?.name}</td>
                  <td className="mono" style={{ color: "var(--cds-text-secondary)", whiteSpace: "nowrap" }}>
                    {j.date}<br/>{j.time}
                  </td>
                  {isAdmin && <td style={{ color: "var(--cds-text-secondary)" }}>{tech?.name || "—"}</td>}
                  <td>
                    <span style={{ color: typeConfig?.color, fontWeight: 500 }}>
                      {typeConfig?.icon} {typeConfig?.label}
                    </span>
                  </td>
                  <td><PrioTag p={j.priority} /></td>
                  <td><StatusTag status={j.status} /></td>
                  <td style={{ fontSize: 16 }}>
                    {(j.alerts || []).map(a => (
                      <span key={a} title={ALERT_CFG[a]?.label}>{ALERT_CFG[a]?.icon}</span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: "var(--cds-spacing-08)", textAlign: "center", color: "var(--cds-text-helper)" }}>
            No jobs match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
