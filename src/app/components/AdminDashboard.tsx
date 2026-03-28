'use client';

import React from 'react';
import { Job, User, Customer } from '@/app/types';
import { TYPE_CFG, ALERT_CFG, TECH_STATUS } from '@/app/lib/config';
import { StatusTag, SectionTitle, Avatar } from './ui';

interface AdminDashboardProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  onJobClick: (job: Job) => void;
}

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

export default function AdminDashboard({ jobs, techs, customers, onJobClick }: AdminDashboardProps) {
  const todayJobs = jobs.filter(j => j.date === todayStr);
  const alertJobs = jobs.filter(j => j.alerts && j.alerts.length > 0 && j.status !== "completed");
  const unallocatedCount = jobs.filter(j => j.status === "unallocated").length;
  
  const stats = [
    { label: "Total jobs", v: jobs.length },
    { label: "On site now", v: jobs.filter(j => j.status === "on-site").length },
    { label: "Scheduled", v: jobs.filter(j => j.status === "scheduled").length },
    { label: "Completed", v: jobs.filter(j => j.status === "completed").length },
  ];

  return (
    <div className="fi-anim">
      <div className="page-hdr">
        <h1>Dashboard</h1>
        <p>Splash Air Conditioning — field operations overview</p>
      </div>
      
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
