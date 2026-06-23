'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Job, Customer, RefrigerantType, User } from '@/app/types';
import { SectionTitle } from './ui';
import { canViewODSReport } from '@/app/lib/permissions';

interface ODSReportProps {
  jobs: Job[];
  customers: Customer[];
  currentUser: User;
  onExport?: () => void;
}

const REFRIGERANT_TYPES: RefrigerantType[] = ['R-32', 'R-410A', 'R-22', 'R-134a', 'R-407C', 'R-600A', 'R-290'];

function getJobsWithRefrigerantData(jobs: Job[]): Job[] {
  return jobs.filter(job => job.diagnostics && (job.diagnostics.refrigerantRecovered !== undefined || job.diagnostics.refrigerantUsed !== undefined || job.diagnostics.refrigerantReused !== undefined));
}

function getTotalRecovered(jobs: Job[]): number { return jobs.reduce((t, j) => t + (j.diagnostics?.refrigerantRecovered || 0), 0); }
function getTotalUsed(jobs: Job[]): number { return jobs.reduce((t, j) => t + (j.diagnostics?.refrigerantUsed || 0), 0); }
function getTotalReused(jobs: Job[]): number { return jobs.reduce((t, j) => t + (j.diagnostics?.refrigerantReused || 0), 0); }
function getR22JobCount(jobs: Job[]): number { return jobs.filter(j => j.diagnostics?.refrigerantType === 'R-22' && (j.diagnostics?.refrigerantRecovered || 0) > 0).length; }
function getRetrofitCount(jobs: Job[]): number { return jobs.filter(j => j.diagnostics && (j.diagnostics.refrigerantRecovered || 0) > 0 && (j.diagnostics.refrigerantUsed || 0) > 0).length; }

function getCustomerName(customerId: string, customers: Customer[]): string {
  return customers.find(c => c.id === customerId)?.name || 'Unknown';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusStyle(status: string): React.CSSProperties {
  const styles: Record<string, React.CSSProperties> = {
    completed: { background: '#d4edda', color: '#155724' },
    'in-progress': { background: '#fff3cd', color: '#664d03' },
    scheduled: { background: '#d1ecf1', color: '#0c5460' },
    cancelled: { background: '#f8d7da', color: '#842029' },
  };
  return styles[status] || { background: '#e0e0e0', color: '#161616' };
}

export default function ODSReport({ jobs, customers, currentUser, onExport }: ODSReportProps) {
  if (!canViewODSReport(currentUser.role)) return null;
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<string>('all');
  const [liveJobs, setLiveJobs] = useState<Job[]>(jobs);

  useEffect(() => {
    let alive = true;
    fetch('/api/jobs').then(r => r.ok ? r.json() : null).then(data => { if (alive && Array.isArray(data)) setLiveJobs(data as Job[]); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const odsJobs = useMemo(() => getJobsWithRefrigerantData(liveJobs), [liveJobs]);
  const filteredJobs = useMemo(() => selectedRefrigerant === 'all' ? odsJobs : odsJobs.filter(j => j.diagnostics?.refrigerantType === selectedRefrigerant), [odsJobs, selectedRefrigerant]);
  const totalRecovered = useMemo(() => getTotalRecovered(filteredJobs), [filteredJobs]);
  const totalUsed = useMemo(() => getTotalUsed(filteredJobs), [filteredJobs]);
  const totalReused = useMemo(() => getTotalReused(filteredJobs), [filteredJobs]);
  const r22Count = useMemo(() => getR22JobCount(odsJobs), [odsJobs]);
  const retrofitCount = useMemo(() => getRetrofitCount(odsJobs), [odsJobs]);

  return (
    <div className="animate-fade-in">
      <div className="p-4 mb-6" style={{ background: 'linear-gradient(135deg, #00695c 0%, #004d40 50%, #00332a 100%)' }}>
        <h1 className="text-white text-2xl font-semibold">ODS Compliance Report</h1>
        <p className="text-white/80 text-sm mt-2">Track refrigerant recovery, usage, and compliance with ozone depleting substances regulations</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-layer p-4 border-t-4" style={{ borderTopColor: '#00695c' }}>
          <div className="text-3xl font-bold" style={{ color: '#00695c' }}>{totalRecovered.toFixed(2)}</div>
          <div className="text-xs text-text-secondary mt-1">Total Recovery (kg)</div>
        </div>
        <div className="bg-layer p-4 border-t-4" style={{ borderTopColor: '#00695c' }}>
          <div className="text-3xl font-bold" style={{ color: '#00695c' }}>{totalUsed.toFixed(2)}</div>
          <div className="text-xs text-text-secondary mt-1">Total Used (kg)</div>
        </div>
        <div className="bg-layer p-4 border-t-4" style={{ borderTopColor: '#00695c' }}>
          <div className="text-3xl font-bold" style={{ color: '#00695c' }}>{r22Count}</div>
          <div className="text-xs text-text-secondary mt-1">R-22 Recovered</div>
        </div>
        <div className="bg-layer p-4 border-t-4" style={{ borderTopColor: '#00695c' }}>
          <div className="text-3xl font-bold" style={{ color: '#00695c' }}>{retrofitCount}</div>
          <div className="text-xs text-text-secondary mt-1">Retrofits Completed</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <SectionTitle color="#004d40">Filter by Refrigerant</SectionTitle>
          <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={selectedRefrigerant} onChange={e => setSelectedRefrigerant(e.target.value)}>
            <option value="all">All Refrigerants</option>
            {REFRIGERANT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {onExport && (
          <button className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border-none cursor-pointer ml-auto" style={{ background: '#00695c', color: '#fff' }} onClick={onExport}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8.5 2.5a.5.5 0 0 0-1 0v5.793L5.354 6.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 8.293V2.5z"/><path d="M3.5 9.5a.5.5 0 0 1 .5.5v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2a.5.5 0 0 1 1 0v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a.5.5 0 0 1 .5-.5z"/></svg>
            Export Report
          </button>
        )}
      </div>

      <div className="bg-layer p-4 border border-border-subtle mb-6">
        <SectionTitle>Refrigerant Summary</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[28px] font-bold" style={{ color: '#00695c' }}>{filteredJobs.length}</div>
            <div className="text-xs text-text-secondary mt-1">Total Jobs</div>
          </div>
          <div>
            <div className="text-[28px] font-bold" style={{ color: '#00695c' }}>{totalReused.toFixed(2)}</div>
            <div className="text-xs text-text-secondary mt-1">Total Reused (kg)</div>
          </div>
          <div>
            <div className="text-[28px] font-bold" style={{ color: '#00695c' }}>{totalRecovered > 0 ? ((totalReused / totalRecovered) * 100).toFixed(1) : '0.0'}%</div>
            <div className="text-xs text-text-secondary mt-1">Recovery Rate</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface">
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Date</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Job ID</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Customer</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Refrigerant</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Recovered (kg)</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Used (kg)</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Reused (kg)</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-10"><p className="text-sm text-text-secondary">No ODS records found for the selected filter.</p></td></tr>
            ) : (
              filteredJobs.map(job => (
                <tr key={job.id} className="border-b border-border-subtle hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm text-text-primary">{formatDate(job.date)}</td>
                  <td className="px-4 py-3"><span className="mono text-xs">{job.jobCardRef || job.id}</span></td>
                  <td className="px-4 py-3 text-sm text-text-primary">{getCustomerName(job.customerId, customers)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center h-6 px-2 text-[11px] font-medium" style={{ background: '#e0f2f1', color: '#00695c' }}>{job.diagnostics?.refrigerantType || 'N/A'}</span>
                  </td>
                  <td className="mono px-4 py-3 text-sm">{(job.diagnostics?.refrigerantRecovered || 0).toFixed(2)}</td>
                  <td className="mono px-4 py-3 text-sm">{(job.diagnostics?.refrigerantUsed || 0).toFixed(2)}</td>
                  <td className="mono px-4 py-3 text-sm">{(job.diagnostics?.refrigerantReused || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center h-6 px-2 text-[11px] font-medium" style={getStatusStyle(job.status)}>{job.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-surface border border-border-subtle">
        <p className="text-xs text-text-secondary m-0">
          <strong>Note:</strong> ODS (Ozone Depleting Substances) compliance requires proper documentation of all refrigerant handling. This report includes all jobs with refrigerant recovery, usage, or reuse data. R-22 is a HCFC refrigerant being phased out under the Montreal Protocol.
        </p>
      </div>
    </div>
  );
}
