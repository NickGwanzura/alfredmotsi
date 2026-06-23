'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, User as UserIcon, Clock, FileText, Filter, Activity } from 'lucide-react';
import { User, AuditLogEntry, AuditAction } from '@/app/types';

interface AuditLogViewProps {
  techs: User[];
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
}

const PAGE_SIZE = 50;

const ACTION_CONFIG: Record<AuditAction, { label: string; color: string; bg: string; group: string }> = {
  login:            { label: 'Login',              color: '#0043ce', bg: 'bg-blue-100', group: 'Access' },
  view_job:         { label: 'Viewed Job',         color: '#198038', bg: 'bg-emerald-100', group: 'Jobs' },
  edit_job:         { label: 'Edited Job',         color: '#f1c21b', bg: 'bg-amber-100', group: 'Jobs' },
  complete_job:     { label: 'Completed Job',      color: '#8a3ffc', bg: 'bg-purple-100', group: 'Jobs' },
  delete_job:       { label: 'Deleted Job',        color: '#da1e28', bg: 'bg-red-100', group: 'Jobs' },
  adjust_stock:     { label: 'Adjusted Stock',     color: '#ff832b', bg: 'bg-orange-100', group: 'Stock' },
  create_customer:  { label: 'Created Customer',   color: '#1192e8', bg: 'bg-sky-100', group: 'Customers' },
  update_customer:  { label: 'Updated Customer',   color: '#0f62fe', bg: 'bg-blue-100', group: 'Customers' },
  delete_customer:  { label: 'Deleted Customer',   color: '#da1e28', bg: 'bg-red-100', group: 'Customers' },
  create_gas_stock: { label: 'Created Gas Stock',  color: '#007d79', bg: 'bg-teal-100', group: 'Stock' },
  update_gas_stock: { label: 'Updated Gas Stock',  color: '#005d5d', bg: 'bg-teal-100', group: 'Stock' },
  delete_gas_stock: { label: 'Deleted Gas Stock',  color: '#da1e28', bg: 'bg-red-100', group: 'Stock' },
  create_consumable:{ label: 'Added Consumable',   color: '#007d79', bg: 'bg-teal-100', group: 'Consumables' },
  delete_consumable:{ label: 'Deleted Consumable', color: '#da1e28', bg: 'bg-red-100', group: 'Consumables' },
  create_user:      { label: 'Created User',       color: '#6929c4', bg: 'bg-purple-100', group: 'Users' },
  update_user:      { label: 'Updated User',       color: '#8a3ffc', bg: 'bg-purple-100', group: 'Users' },
  delete_user:      { label: 'Deleted User',       color: '#da1e28', bg: 'bg-red-100', group: 'Users' },
};

const ACTION_OPTIONS = Object.entries(ACTION_CONFIG) as Array<[AuditAction, typeof ACTION_CONFIG[AuditAction]]>;
const DESTRUCTIVE_ACTIONS = new Set<AuditAction>(['delete_job', 'delete_customer', 'delete_gas_stock', 'delete_consumable', 'delete_user']);

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function AuditLogView({ techs }: AuditLogViewProps) {
  const [logs, setLogs]       = useState<AuditLogEntry[]>([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');

  const [filterUser,   setFilterUser]   = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [filterJobId,  setFilterJobId]  = useState('');

  const fetchLogs = useCallback(async (targetPage: number) => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage)); params.set('limit', String(PAGE_SIZE));
      if (filterUser) params.set('userId', filterUser);
      if (filterAction) params.set('action', filterAction);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      if (filterJobId.trim()) params.set('jobId', filterJobId.trim());
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data: AuditLogResponse = await res.json();
      setLogs(data.logs); setTotal(data.total); setPages(data.pages); setPage(data.page);
    } catch { setErr('Could not load audit records. Please try again.'); }
    finally { setLoading(false); }
  }, [filterUser, filterAction, filterFrom, filterTo, filterJobId]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  function handleRefresh() { fetchLogs(page); }
  function handlePrev() { if (page > 1) fetchLogs(page - 1); }
  function handleNext() { if (page < pages) fetchLogs(page + 1); }
  function clearFilters() { setFilterUser(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); setFilterJobId(''); }
  function applyDateRange(days: number) { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - days + 1); setFilterFrom(from.toISOString().split('T')[0]); setFilterTo(to.toISOString().split('T')[0]); }

  const hasFilters = filterUser || filterAction || filterFrom || filterTo || filterJobId;
  const loadedWithLocation = logs.filter(log => log.latitude != null && log.longitude != null).length;
  const loadedDestructive = logs.filter(log => DESTRUCTIVE_ACTIONS.has(log.action)).length;
  const loadedUsers = new Set(logs.map(log => log.userId)).size;
  const latestLog = logs[0]?.createdAt;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all user activity across the platform.</p>
        </div>
        <button onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors border-none cursor-pointer">
          <Clock size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Records', value: total, icon: Activity, color: 'from-blue-500 to-blue-600' },
          { label: 'Users on Page', value: loadedUsers, icon: UserIcon, color: 'from-violet-500 to-violet-600' },
          { label: 'With Location', value: loadedWithLocation, icon: MapPin, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Destructive', value: loadedDestructive, icon: FileText, color: loadedDestructive > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}><s.icon size={18} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-1.5 text-gray-400 mr-2 self-center">
            <Filter size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
          </div>
          <div className="flex gap-1">
            {[{ label: 'Today', days: 1 }, { label: '7 days', days: 7 }, { label: '30 days', days: 30 }].map(({ label, days }) => (
              <button key={label} onClick={() => applyDateRange(days)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">{label}</button>
            ))}
          </div>
          <div className="w-full sm:w-auto min-w-[160px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block"><UserIcon size={12} className="inline mr-1" />User</label>
            <select className="w-full h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
              value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">All users</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto min-w-[160px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block"><FileText size={12} className="inline mr-1" />Action</label>
            <select className="w-full h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
              value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">All actions</option>
              {ACTION_OPTIONS.map(([value, cfg]) => <option key={value} value={value}>{cfg.group} · {cfg.label}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto min-w-[160px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block"><FileText size={12} className="inline mr-1" />Job ID</label>
            <input type="search" className="w-full h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              value={filterJobId} onChange={e => setFilterJobId(e.target.value)} placeholder="Exact job id" />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block"><Clock size={12} className="inline mr-1" />From</label>
            <input type="date" className="w-full h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block"><Clock size={12} className="inline mr-1" />To</label>
            <input type="date" className="w-full h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer self-end">Clear</button>
          )}
        </div>
      </div>

      {!loading && logs.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-sm">
            <p className="font-semibold text-blue-800">Showing {logs.length} of {total} record{total !== 1 ? 's' : ''}</p>
            <p className="text-blue-600 mt-0.5">Latest activity {latestLog ? formatDateTime(latestLog) : '—'} · Page {page} of {pages || 1}</p>
          </div>
        </div>
      )}

      {err && <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{err}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {[
                { icon: Clock, label: 'Time' },
                { icon: UserIcon, label: 'User' },
                { icon: FileText, label: 'Action' },
                { label: 'Job ID' },
                { label: 'Reason' },
                { icon: MapPin, label: 'Location' },
                { label: 'IP Address' },
              ].map(col => (
                <th key={col.label} className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  <span className="flex items-center gap-1.5">{col.icon && <col.icon size={13} />} {col.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center text-gray-400 py-10 text-sm">Loading audit records...</td></tr>}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={7}><div className="flex flex-col items-center justify-center py-10 text-gray-400"><Activity size={40} className="mb-3 opacity-30" /><p className="text-sm">No audit records found.</p></div></td></tr>
            )}
            {!loading && logs.map(log => {
              const action = ACTION_CONFIG[log.action] ?? { label: log.action, color: '#6f6f6f', bg: 'bg-gray-100', group: 'Other' };
              const hasLocation = log.latitude != null && log.longitude != null;
              return (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${action.bg}`} style={{ color: action.color }}>{action.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.jobId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[260px] truncate" title={log.reason ?? undefined}>{log.reason || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {hasLocation ? (
                      <a href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 no-underline hover:underline">
                        <MapPin size={12} /> View Map
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-gray-400">Page {page} of {pages} · {total} record{total !== 1 ? 's' : ''} total</span>
          <div className="flex gap-1">
            <button onClick={handlePrev} disabled={page <= 1}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
            <button onClick={handleNext} disabled={page >= pages}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
