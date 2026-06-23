'use client';

import React, { useState } from 'react';
import { Job, User, Customer, GasStockItem, GasUsageRecord } from '@/app/types';
import { TYPE_CFG, ALERT_CFG, TECH_STATUS } from '@/app/lib/config';
import { StatusTag, SectionTitle, Avatar } from './ui';
import { Mail, AlertTriangle, CalendarDays, Clock, UserCheck, Wrench, ClipboardList, BarChart3, RefreshCcw } from 'lucide-react';

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
  jobs, techs, customers, gasStock = [], gasUsage = [],
  onJobClick, focus = 'dashboard',
}: AdminDashboardProps) {
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; sent?: number; total?: number; error?: string } | null>(null);

  const todayJobs = jobs.filter(j => j.date === todayStr);
  const alertJobs = jobs.filter(j => j.alerts && j.alerts.length > 0 && j.status !== "completed");
  const unallocatedCount = jobs.filter(j => j.status === "unallocated").length;
  const jobsMissingClock = jobs.filter(j => j.status !== 'cancelled' && (!j.clockIn || (j.status === 'completed' && !j.clockOut))).sort(sortByDateDesc);
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const completedMissingDiagnostics = completedJobs.filter(j => !hasDiagnosticData(j)).sort(sortByDateDesc);
  const completedMissingSignature = completedJobs.filter(j => !j.signature).sort(sortByDateDesc);
  const completedMissingGas = completedJobs.filter(j => GAS_RELEVANT_TYPES.has(j.type) && !hasRecordedGas(j, gasUsage)).sort(sortByDateDesc);
  const lowGasStock = gasStock.filter(item => { const r = item.quantity > 0 && item.remaining / item.quantity <= 0.2; return item.remaining <= 2 || r; }).sort((a, b) => a.remaining - b.remaining);

  const stats = [
    { label: "Total Jobs", v: jobs.length, icon: ClipboardList, color: "from-blue-500 to-blue-600" },
    { label: "On Site Now", v: jobs.filter(j => j.status === "on-site").length, icon: UserCheck, color: "from-amber-500 to-amber-600" },
    { label: "Scheduled", v: jobs.filter(j => j.status === "scheduled").length, icon: CalendarDays, color: "from-purple-500 to-purple-600" },
    { label: "Completed", v: jobs.filter(j => j.status === "completed").length, icon: BarChart3, color: "from-emerald-500 to-emerald-600" },
  ];

  const sendAnnouncement = async () => {
    setSending(true); setSendResult(null);
    try {
      const res = await fetch('/api/admin/announce-big-fixes', { method: 'POST' });
      setSendResult(await res.json());
    } catch (err: unknown) {
      setSendResult({ ok: false, error: err instanceof Error ? err.message : 'Failed' });
    } finally { setSending(false); }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">Field operations overview — {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={sendAnnouncement}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all duration-200 border-none cursor-pointer disabled:opacity-50"
          >
            {sending ? <RefreshCcw size={16} className="animate-spin" /> : <Mail size={16} />}
            {sending ? 'Sending...' : 'Send Announcement'}
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {sendResult && (
        <div className={`flex items-start gap-4 p-4 mb-6 rounded-lg border-l-4 shadow-sm ${
          sendResult.ok ? 'bg-emerald-50 border-l-emerald-500' : 'bg-red-50 border-l-red-500'
        }`}>
          <div className={`p-1.5 rounded-full ${sendResult.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {sendResult.ok ? <BarChart3 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{sendResult.ok ? 'Email Sent' : 'Failed to Send'}</p>
            <p className="text-sm text-gray-600 mt-0.5">
              {sendResult.ok ? `Sent ${sendResult.sent} of ${sendResult.total} emails.` : sendResult.error || 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {unallocatedCount > 0 && (
        <div className="flex items-center gap-4 p-4 mb-6 rounded-lg bg-amber-50 border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100/70 transition-colors group"
          onClick={() => { const j = jobs.find(j => j.status === "unallocated"); if (j) onJobClick(j); }}>
          <div className="p-2 rounded-full bg-amber-100 text-amber-600"><AlertTriangle size={20} /></div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">{unallocatedCount} unallocated job{unallocatedCount > 1 ? 's' : ''}</p>
            <p className="text-sm text-amber-600">Click to view and assign a technician</p>
          </div>
          <span className="text-amber-600 text-sm font-medium group-hover:underline">View →</span>
        </div>
      )}

      {alertJobs.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertJobs.map(j => (
            <div key={j.id} className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-200 shadow-sm cursor-pointer hover:bg-red-100/70 transition-colors group"
              onClick={() => onJobClick(j)}>
              <div className="p-1.5 rounded-full bg-red-100 text-red-600"><AlertTriangle size={16} /></div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-red-800">Active Alert — {j.title}</p>
                <p className="text-sm text-red-600 mt-0.5">{j.alerts.map(a => ALERT_CFG[a]?.label).join(", ")} · {customers.find(c => c.id === j.customerId)?.name}</p>
              </div>
              <span className="text-red-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}>
                <s.icon size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.v}</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${s.color} transition-all duration-500`}
                style={{ width: `${Math.min(100, (s.v / Math.max(1, Math.max(...stats.map(x => x.v)))) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600"><CalendarDays size={16} /></div>
              <h3 className="font-semibold text-gray-900">Today&apos;s Jobs</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{todayJobs.length}</span>
            </div>
          </div>
          {todayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <CalendarDays size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No jobs scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayJobs.slice(0, 5).map(j => {
                const cust = customers.find(c => c.id === j.customerId);
                const tech = techs.find(t => t.id === j.techIds[0]);
                const typeColor = TYPE_CFG[j.type]?.color || "#888";
                return (
                  <div key={j.id} className="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-pointer transition-all duration-200"
                    onClick={() => onJobClick(j)}>
                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: typeColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{j.title}</p>
                        <StatusTag status={j.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {cust?.name} · <span className="font-medium">{j.time}</span>
                      </p>
                      {tech && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Avatar name={tech.name} size={18} color={typeColor} />
                          <span className="text-xs text-gray-500">{tech.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {todayJobs.length > 5 && (
                <button className="w-full text-center text-sm text-brand-600 font-medium py-2 hover:bg-gray-50 rounded-lg transition-colors border-none cursor-pointer">
                  +{todayJobs.length - 5} more jobs
                </button>
              )}
            </div>
          )}
        </div>

        {/* Technician Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><UserCheck size={16} /></div>
            <h3 className="font-semibold text-gray-900">Technician Status</h3>
          </div>
          {techs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <UserCheck size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No technicians available.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {techs.map(t => {
                const onJob = jobs.find(j => j.techIds.includes(t.id) && (j.status === "on-site" || j.status === "in-progress"));
                const ts = TECH_STATUS[t.status || "available"] || TECH_STATUS.available;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all duration-200">
                    <div className="relative">
                      <Avatar name={t.name} size={36} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full" style={{ background: ts.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.specialty || 'General'}</p>
                      {onJob ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Wrench size={12} className="text-amber-500" />
                          <p className="text-xs text-gray-600 truncate">{onJob.title}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs text-emerald-600 font-medium">Available</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={12} />
                      <span>{ts.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
