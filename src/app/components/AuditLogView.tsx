'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, User as UserIcon, Clock, FileText, Filter } from 'lucide-react';
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

const ACTION_CONFIG: Record<AuditAction, { label: string; color: string; group: string }> = {
  login:            { label: 'Login',              color: '#0043ce', group: 'Access' },
  view_job:         { label: 'Viewed Job',         color: '#198038', group: 'Jobs' },
  edit_job:         { label: 'Edited Job',         color: '#f1c21b', group: 'Jobs' },
  complete_job:     { label: 'Completed Job',      color: '#8a3ffc', group: 'Jobs' },
  delete_job:       { label: 'Deleted Job',        color: '#da1e28', group: 'Jobs' },
  adjust_stock:     { label: 'Adjusted Stock',     color: '#ff832b', group: 'Stock' },
  create_customer:  { label: 'Created Customer',   color: '#1192e8', group: 'Customers' },
  update_customer:  { label: 'Updated Customer',   color: '#0f62fe', group: 'Customers' },
  delete_customer:  { label: 'Deleted Customer',   color: '#da1e28', group: 'Customers' },
  create_gas_stock: { label: 'Created Gas Stock',  color: '#007d79', group: 'Stock' },
  update_gas_stock: { label: 'Updated Gas Stock',  color: '#005d5d', group: 'Stock' },
  delete_gas_stock: { label: 'Deleted Gas Stock',  color: '#da1e28', group: 'Stock' },
  create_consumable:{ label: 'Added Consumable',   color: '#007d79', group: 'Consumables' },
  delete_consumable:{ label: 'Deleted Consumable', color: '#da1e28', group: 'Consumables' },
  create_user:      { label: 'Created User',       color: '#6929c4', group: 'Users' },
  update_user:      { label: 'Updated User',       color: '#8a3ffc', group: 'Users' },
  delete_user:      { label: 'Deleted User',       color: '#da1e28', group: 'Users' },
};

const ACTION_OPTIONS = Object.entries(ACTION_CONFIG) as Array<[AuditAction, typeof ACTION_CONFIG[AuditAction]]>;
const DESTRUCTIVE_ACTIONS = new Set<AuditAction>(['delete_job', 'delete_customer', 'delete_gas_stock', 'delete_consumable', 'delete_user']);

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function Spinner() {
  return (
    <div className="flex items-center justify-center p-12 text-text-secondary gap-2.5">
      <div className="w-5 h-5 border-2 border-border-subtle border-t-interactive rounded-full animate-spin" />
      <span className="text-sm">Loading audit records…</span>
    </div>
  );
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

  const tb = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs';

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
          <p className="text-sm text-text-secondary">Track all user activity across the platform.</p>
        </div>
        <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={handleRefresh}>
          <Clock size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{total}</div>
          <div className="text-xs text-text-secondary mt-1">{hasFilters ? 'Matching records' : 'Total records'}</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{loadedUsers}</div>
          <div className="text-xs text-text-secondary mt-1">Users on page</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{loadedWithLocation}</div>
          <div className="text-xs text-text-secondary mt-1">With location</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-support-error">
          <div className="text-3xl font-bold text-text-primary">{loadedDestructive}</div>
          <div className="text-xs text-text-secondary mt-1">Destructive actions</div>
        </div>
      </div>

      <div className="bg-layer p-4 border border-border-subtle mb-4 flex flex-wrap gap-2 items-end">
        <div className="flex items-center gap-1.5 text-text-secondary mr-1">
          <Filter size={14} />
          <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
        </div>
        <div className="flex gap-1 self-end">
          {[
            { label: 'Today', days: 1 },
            { label: '7 days', days: 7 },
            { label: '30 days', days: 30 },
          ].map(({ label, days }) => (
            <button key={label} className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} type="button" onClick={() => applyDateRange(days)}>{label}</button>
          ))}
        </div>
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <label className="text-[11px] text-text-secondary flex items-center gap-1"><UserIcon size={11} /> User</label>
          <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors min-w-[160px]" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">All users</option>
            {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <label className="text-[11px] text-text-secondary flex items-center gap-1"><FileText size={11} /> Action</label>
          <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors min-w-[160px]" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTION_OPTIONS.map(([value, cfg]) => <option key={value} value={value}>{cfg.group} · {cfg.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5 min-w-[180px]">
          <label className="text-[11px] text-text-secondary flex items-center gap-1"><FileText size={11} /> Job ID</label>
          <input type="search" className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors min-w-[180px]" value={filterJobId} onChange={e => setFilterJobId(e.target.value)} placeholder="Exact job id" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] text-text-secondary flex items-center gap-1"><Clock size={11} /> From</label>
          <input type="date" className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors min-w-[140px]" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] text-text-secondary flex items-center gap-1"><Clock size={11} /> To</label>
          <input type="date" className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors min-w-[140px]" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors self-end`} onClick={clearFilters}>Clear</button>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 border-l-4 border-l-support-info">
          <div>
            <div className="font-semibold text-sm text-text-primary">Showing {logs.length} of {total} record{total !== 1 ? 's' : ''}</div>
            <div className="text-sm text-text-secondary">Latest activity {latestLog ? formatDateTime(latestLog) : '—'} · Page {page} of {pages || 1}</div>
          </div>
        </div>
      )}

      {err && (
        <div className="p-4 mb-4 bg-red-50 border border-support-error text-support-error text-sm">{err}</div>
      )}

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface">
              {[
                { icon: Clock, label: 'Time', minW: 150 },
                { icon: UserIcon, label: 'User', minW: 140 },
                { icon: FileText, label: 'Action', minW: 130 },
                { label: 'Job ID', minW: 110 },
                { label: 'Reason', minW: 180 },
                { icon: MapPin, label: 'Location', minW: 120 },
                { label: 'IP Address', minW: 130 },
              ].map(col => (
                <th key={col.label} className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle" style={{ minWidth: col.minW }}>
                  <span className="flex items-center gap-1.5">
                    {col.icon && <col.icon size={13} />} {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-0 border-0"><Spinner /></td></tr>}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={7} className="text-center p-12 text-text-secondary text-sm">No audit records found.</td></tr>
            )}
            {!loading && logs.map(log => {
              const action = ACTION_CONFIG[log.action] ?? { label: log.action, color: 'var(--color-text-secondary)', group: 'Other' };
              const hasLocation = log.latitude != null && log.longitude != null;
              return (
                <tr key={log.id} className="border-b border-border-subtle hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-sm text-text-primary">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center h-6 px-2 text-[11px] font-semibold tracking-wide border" style={{ background: `${action.color}22`, color: action.color, borderColor: `${action.color}44` }}>{action.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary font-mono">{log.jobId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary max-w-[260px]" title={log.reason ?? undefined}>
                    {log.reason ? (
                      <span className="inline-block max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap align-middle">{log.reason}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {hasLocation ? (
                      <a href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-interactive no-underline text-xs">
                        <MapPin size={12} /> View Map
                      </a>
                    ) : <span className="text-text-secondary">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary font-mono">{log.ipAddress ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-0.5">
          <span className="text-xs text-text-secondary">Page {page} of {pages} · {total} record{total !== 1 ? 's' : ''} total</span>
          <div className="flex gap-1">
            <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors ${page <= 1 ? 'opacity-40 cursor-not-allowed' : ''}`} onClick={handlePrev} disabled={page <= 1}>← Prev</button>
            <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors ${page >= pages ? 'opacity-40 cursor-not-allowed' : ''}`} onClick={handleNext} disabled={page >= pages}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
