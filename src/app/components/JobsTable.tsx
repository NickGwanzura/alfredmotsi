'use client';

import React, { useState } from 'react';
import { Job, User, Customer, JobStatus, JobType, GasUsageRecord } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, ALERT_CFG } from '@/app/lib/config';
import { getGasUsageWarning } from '@/app/lib/gasUsageWarning';
import { StatusTag, PrioTag } from './ui';
import { Plus, AlertTriangle, Search, ClipboardList, UserCheck, BarChart3 } from 'lucide-react';
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

  const activeJobs = base.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;
  const completedJobsCount = base.filter(j => j.status === 'completed').length;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{canViewAllJobs(userRole) ? "All Jobs" : "My Jobs"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} records</p>
        </div>
        {canManageJobs(userRole) && onAddJob && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
            onClick={onAddJob}
          >
            <Plus size={16} />
            Add Job
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Jobs</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"><ClipboardList size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{base.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active Jobs</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm"><UserCheck size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{activeJobs}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Completed</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm"><BarChart3 size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{completedJobsCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-gray-900 placeholder-gray-400"
              placeholder="Search jobs..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <select
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-600 cursor-pointer"
            value={sf}
            onChange={e => setSF(e.target.value as JobStatus | "all")}
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-600 cursor-pointer"
            value={tf}
            onChange={e => setTF(e.target.value as JobType | "all")}
          >
            <option value="all">All types</option>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Job ID</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Title</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Customer</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Date</th>
              {canViewAllJobs(userRole) && <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Lead Tech</th>}
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Type</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Priority</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Status</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Alerts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(j => {
              const cust = customers.find(c => c.id === j.customerId);
              const tech = techs.find(t => t.id === j.techIds[0]);
              const typeConfig = TYPE_CFG[j.type];
              return (
                <tr key={j.id} onClick={() => onJobClick(j)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{j.id}</td>
                  <td className="px-4 py-3 font-medium text-sm text-gray-900">{j.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{cust?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{j.date}</div>
                    <div className="text-xs text-gray-400 font-mono">{j.time}</div>
                  </td>
                  {canViewAllJobs(userRole) && <td className="px-4 py-3 text-sm text-gray-500">{tech?.name || '\u2014'}</td>}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-700">
                      {typeConfig?.icon} {typeConfig?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3"><PrioTag p={j.priority} /></td>
                  <td className="px-4 py-3"><StatusTag status={j.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(j.alerts || []).map(a => (
                        <span key={a} title={ALERT_CFG[a]?.label} className="text-base">{ALERT_CFG[a]?.icon}</span>
                      ))}
                      {(() => {
                        const warn = getGasUsageWarning(j, gasUsage, j.id);
                        if (!warn) return null;
                        const color = warn.level === 'overdue' ? '#da1e28' : '#f1c21b';
                        return (
                          <span className="inline-flex align-middle" style={{ color }} title={warn.message}>
                            <AlertTriangle size={16} />
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <ClipboardList size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No jobs match your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
