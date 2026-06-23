'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Job, Customer, RefrigerantType, User } from '@/app/types';
import { SectionTitle } from './ui';
import { canViewODSReport } from '@/app/lib/permissions';
import { Leaf, Download, Recycle, AlertTriangle, BarChart3 } from 'lucide-react';

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
function getCustomerName(customerId: string, customers: Customer[]): string { return customers.find(c => c.id === customerId)?.name || 'Unknown'; }
function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

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
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 rounded-xl p-8 mb-8 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-white/20 text-white"><Leaf size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">ODS Compliance Report</h1>
            <p className="text-emerald-100 text-sm mt-1">Track refrigerant recovery, usage, and compliance with ozone depleting substances regulations</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Recovery</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm"><Recycle size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight font-mono">{totalRecovered.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">kg recovered</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Used</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"><BarChart3 size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight font-mono">{totalUsed.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">kg used</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">R-22 Recovered</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm"><AlertTriangle size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{r22Count}</p>
          <p className="text-xs text-gray-400 mt-1">jobs with R-22 recovery</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Retrofits</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm"><Recycle size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{retrofitCount}</p>
          <p className="text-xs text-gray-400 mt-1">retrofits completed</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Filter by Refrigerant</label>
          <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
            value={selectedRefrigerant} onChange={e => setSelectedRefrigerant(e.target.value)}>
            <option value="all">All Refrigerants</option>
            {REFRIGERANT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {onExport && (
          <button onClick={onExport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg shadow-sm hover:from-emerald-700 hover:to-emerald-800 transition-all border-none cursor-pointer">
            <Download size={16} /> Export Report
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <SectionTitle>Refrigerant Summary</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <p className="text-2xl font-bold text-emerald-700">{filteredJobs.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Jobs</p>
          </div>
          <div className="text-center p-4 border-x border-gray-100">
            <p className="text-2xl font-bold text-emerald-700">{totalReused.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Reused (kg)</p>
          </div>
          <div className="text-center p-4">
            <p className="text-2xl font-bold text-emerald-700">{totalRecovered > 0 ? ((totalReused / totalRecovered) * 100).toFixed(1) : '0.0'}%</p>
            <p className="text-xs text-gray-500 mt-1">Recovery Rate</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Date</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Job ID</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Customer</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Refrigerant</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Recovered (kg)</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Used (kg)</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Reused (kg)</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr><td colSpan={8}><div className="flex flex-col items-center justify-center py-10 text-gray-400"><Leaf size={40} className="mb-3 opacity-30" /><p className="text-sm">No ODS records found.</p></div></td></tr>
            ) : (
              filteredJobs.map(job => (
                <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">{formatDate(job.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{job.jobCardRef || job.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getCustomerName(job.customerId, customers)}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">{job.diagnostics?.refrigerantType || 'N/A'}</span></td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{(job.diagnostics?.refrigerantRecovered || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{(job.diagnostics?.refrigerantUsed || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{(job.diagnostics?.refrigerantReused || 0).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full" style={getStatusStyle(job.status)}>{job.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-xs text-emerald-800 m-0">
          <strong>Note:</strong> ODS (Ozone Depleting Substances) compliance requires proper documentation of all refrigerant handling.
          This report includes all jobs with refrigerant recovery, usage, or reuse data.
          R-22 is a HCFC refrigerant being phased out under the Montreal Protocol.
        </p>
      </div>
    </div>
  );
}
