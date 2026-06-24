'use client';

import React, { useState } from 'react';
import { Job, User, Customer, GasStockItem, GasUsageRecord } from '@/app/types';
import { TYPE_CFG, ALERT_CFG, TECH_STATUS, STATUS_CFG } from '@/app/lib/config';
import { StatusTag, SectionTitle, Avatar, ContextBanner } from './ui';
import { Mail, AlertTriangle, CalendarDays, Clock, UserCheck, Wrench, ClipboardList, BarChart3, RefreshCcw, Fuel, TrendingUp, DollarSign, FileText, Users, Plus, X } from 'lucide-react';

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
  const [sentThisSession, setSentThisSession] = useState(false);
  const [dismissAlerts, setDismissAlerts] = useState<Set<string>>(new Set());

  const todayJobs = jobs.filter(j => j.date === todayStr);
  const alertJobs = jobs.filter(j => j.alerts && j.alerts.length > 0 && j.status !== "completed").filter(j => !dismissAlerts.has(j.id));
  const unallocatedCount = jobs.filter(j => j.status === "unallocated").length;
  const jobsMissingClock = jobs.filter(j => j.status !== 'cancelled' && (!j.clockIn || (j.status === 'completed' && !j.clockOut))).sort(sortByDateDesc);
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const completedMissingDiagnostics = completedJobs.filter(j => !hasDiagnosticData(j)).sort(sortByDateDesc);
  const completedMissingSignature = completedJobs.filter(j => !j.signature).sort(sortByDateDesc);
  const completedMissingGas = completedJobs.filter(j => GAS_RELEVANT_TYPES.has(j.type) && !hasRecordedGas(j, gasUsage)).sort(sortByDateDesc);
  const lowGasStock = gasStock.filter(item => { const r = item.quantity > 0 && item.remaining / item.quantity <= 0.2; return item.remaining <= 2 || r; }).sort((a, b) => a.remaining - b.remaining);

  const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
  const onSiteCount = jobs.filter(j => j.status === "on-site").length;
  const pendingCount = jobs.filter(j => j.status === "scheduled" || j.status === "pending-booking").length;
  const completedThisMonth = jobs.filter(j => j.status === 'completed' && j.date?.startsWith(todayStr.slice(0, 7))).length;

  const stats = [
    { label: 'Active Jobs', value: activeJobs.length, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { label: 'On Site Now', value: onSiteCount, icon: UserCheck, color: 'from-amber-500 to-amber-600' },
    { label: 'Pending / Scheduled', value: pendingCount, icon: CalendarDays, color: 'from-purple-500 to-purple-600' },
    { label: 'Completed This Month', value: completedThisMonth, icon: BarChart3, color: 'from-emerald-500 to-emerald-600' },
  ];

  const sendAnnouncement = async () => {
    if (sentThisSession) return;
    if (!window.confirm('Send mass announcement email to all users? This cannot be undone.')) return;
    setSending(true); setSendResult(null); setSentThisSession(true);
    try {
      const res = await fetch('/api/admin/announce-big-fixes', { method: 'POST' });
      setSendResult(await res.json());
    } catch (err: unknown) {
      setSendResult({ ok: false, error: err instanceof Error ? err.message : 'Failed' });
    } finally { setSending(false); }
  };

  const upcomingJobs = [...jobs]
    .filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Field operations overview — {today.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={sendAnnouncement}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50"
          >
            {sending ? <RefreshCcw size={16} className="animate-spin" /> : <Mail size={16} />}
            {sending ? 'Sending...' : 'Send Announcement'}
          </button>
        </div>
      </div>

      {/* Context Banner */}
      <ContextBanner title="Welcome to your Admin Dashboard" icon={<ClipboardList size={18} />}>
        <p>This is your command centre. Monitor <strong>today&apos;s jobs</strong>, track <strong>technician status</strong>, and watch for <strong>alerts</strong> on diagnostics, missing clock-ins, or low gas stock.</p>
        <p className="mt-1">Use the sidebar to manage <strong>Jobs</strong>, <strong>Customers</strong>, <strong>Gas Stock</strong>, <strong>Invoices</strong>, and more. Click any job card to open it.</p>
      </ContextBanner>

      {/* Alert Banners */}
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
            <p className="font-semibold text-amber-800">{unallocatedCount} unallocated job{unallocatedCount > 1 ? 's' : ''} — needs technician assignment</p>
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
              <div className="p-1.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertTriangle size={16} />
                <button onClick={(e) => { e.stopPropagation(); setDismissAlerts(s => new Set(s).add(j.id)); }}
                  className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow border border-gray-100">
                  <X size={10} />
                </button>
              </div>
              <div className="flex-1 relative">
                <p className="font-semibold text-sm text-red-800">Active Alert — {j.title}</p>
                <p className="text-sm text-red-600 mt-0.5">{j.alerts.map(a => ALERT_CFG[a]?.label).join(', ')} · {customers.find(c => c.id === j.customerId)?.name}</p>
              </div>
              <span className="text-red-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">View →</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}><s.icon size={18} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts Row — completion quality */}
      {(completedMissingDiagnostics.length > 0 || completedMissingSignature.length > 0 || completedMissingGas.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <SectionTitle>Completion Quality Issues</SectionTitle>
          <div className="space-y-2">
            {completedMissingDiagnostics.length > 0 && (
              <AlertBanner
                level="warning"
                icon={<BarChart3 size={16} />}
                text={`${completedMissingDiagnostics.length} completed jobs missing diagnostic readings`}
                onClick={() => onJobClick(completedMissingDiagnostics[0])}
              />
            )}
            {completedMissingSignature.length > 0 && (
              <AlertBanner
                level="warning"
                icon={<Users size={16} />}
                text={`${completedMissingSignature.length} completed jobs missing customer signature`}
                onClick={() => onJobClick(completedMissingSignature[0])}
              />
            )}
            {completedMissingGas.length > 0 && (
              <AlertBanner
                level="warning"
                icon={<Fuel size={16} />}
                text={`${completedMissingGas.length} completed jobs missing refrigerant gas log`}
                onClick={() => onJobClick(completedMissingGas[0])}
              />
            )}
          </div>
        </div>
      )}

      {/* Action Items + Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Upcoming Jobs */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
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
              <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
                onClick={() => {
                  const a = document.querySelector('[data-schedule-job]') as HTMLButtonElement;
                  a?.click();
                }}>
                <Plus size={16} /> Schedule Job
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayJobs.slice(0, 5).map(j => {
                const cust = customers.find(c => c.id === j.customerId);
                const tech = techs.find(t => t.id === j.techIds[0]);
                const typeColor = TYPE_CFG[j.type]?.color || '#888';
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
                        {j.jobCardRef && <span className="ml-2 font-mono text-gray-400">{j.jobCardRef}</span>}
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

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Technician Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><UserCheck size={16} /></div>
              <h3 className="font-semibold text-gray-900">Technicians</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 ml-auto">{techs.length}</span>
            </div>
            {techs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No technicians.</p>
            ) : (
              <div className="space-y-2">
                {techs.slice(0, 4).map(t => {
                  const onJob = jobs.find(j => j.techIds.includes(t.id) && (j.status === 'on-site' || j.status === 'in-progress'));
                  const ts = TECH_STATUS[t.status || 'available'] || TECH_STATUS.available;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                      <div className="relative">
                        <Avatar name={t.name} size={32} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full" style={{ background: ts.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900">{t.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {onJob ? (
                            <><Wrench size={10} className="inline text-amber-500 mr-0.5" />{onJob.title}</>
                          ) : (
                            <span className="text-emerald-600 font-medium">Available</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Low Gas Stock Alert */}
          {lowGasStock.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-amber-100 text-amber-600 shrink-0"><Fuel size={16} /></div>
                <div>
                  <p className="font-semibold text-sm text-amber-800">{lowGasStock.length} Low Stock Items</p>
                  <p className="text-xs text-amber-600 mt-0.5">Gas stock below 20% threshold — reorder required.</p>
                </div>
              </div>
            </div>
          )}

          {/* Jobs Missing Clock */}
          {jobsMissingClock.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-orange-100 text-orange-600 shrink-0"><Clock size={16} /></div>
                <div>
                  <p className="font-semibold text-sm text-orange-800">{jobsMissingClock.length} Missing Clock Times</p>
                  <p className="text-xs text-orange-600 mt-0.5">Jobs without proper clock-in/out records.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ level, icon, text, onClick }: { level: 'warning' | 'info' | 'error'; icon: React.ReactNode; text: string; onClick?: () => void }) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${styles[level]}`}
      onClick={onClick} role="button">
      <span className="shrink-0">{icon}</span>
      <p className="text-sm font-medium">{text}</p>
      <span className="ml-auto text-xs font-medium opacity-60">View →</span>
    </div>
  );
}
