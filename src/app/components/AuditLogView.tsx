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
  login:            { label: 'Login',              color: 'var(--cds-interactive)', group: 'Access' },
  view_job:         { label: 'Viewed Job',         color: 'var(--cds-support-success)', group: 'Jobs' },
  edit_job:         { label: 'Edited Job',         color: '#f1c21b', group: 'Jobs' },
  complete_job:     { label: 'Completed Job',      color: '#8a3ffc', group: 'Jobs' },
  delete_job:       { label: 'Deleted Job',        color: 'var(--cds-support-error, #da1e28)', group: 'Jobs' },
  adjust_stock:     { label: 'Adjusted Stock',     color: '#ff832b', group: 'Stock' },
  create_customer:  { label: 'Created Customer',   color: '#1192e8', group: 'Customers' },
  update_customer:  { label: 'Updated Customer',   color: '#0f62fe', group: 'Customers' },
  delete_customer:  { label: 'Deleted Customer',   color: 'var(--cds-support-error, #da1e28)', group: 'Customers' },
  create_gas_stock: { label: 'Created Gas Stock',  color: '#007d79', group: 'Stock' },
  update_gas_stock: { label: 'Updated Gas Stock',  color: '#005d5d', group: 'Stock' },
  delete_gas_stock: { label: 'Deleted Gas Stock',  color: 'var(--cds-support-error, #da1e28)', group: 'Stock' },
  create_consumable:{ label: 'Added Consumable',   color: '#007d79', group: 'Consumables' },
  delete_consumable:{ label: 'Deleted Consumable', color: 'var(--cds-support-error, #da1e28)', group: 'Consumables' },
  create_user:      { label: 'Created User',       color: '#6929c4', group: 'Users' },
  update_user:      { label: 'Updated User',       color: '#8a3ffc', group: 'Users' },
  delete_user:      { label: 'Deleted User',       color: 'var(--cds-support-error, #da1e28)', group: 'Users' },
};

const ACTION_OPTIONS = Object.entries(ACTION_CONFIG) as Array<[AuditAction, typeof ACTION_CONFIG[AuditAction]]>;
const DESTRUCTIVE_ACTIONS = new Set<AuditAction>(['delete_job', 'delete_customer', 'delete_gas_stock', 'delete_consumable', 'delete_user']);

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function Spinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s8, 48px)',
      color: 'var(--cds-text-secondary)',
      gap: 10,
    }}>
      <div style={{
        width: 20,
        height: 20,
        border: '2px solid var(--cds-border-subtle)',
        borderTopColor: 'var(--cds-interactive)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: 13 }}>Loading audit records…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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

  // Filters
  const [filterUser,   setFilterUser]   = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [filterJobId,  setFilterJobId]  = useState('');

  const fetchLogs = useCallback(async (targetPage: number) => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(PAGE_SIZE));
      if (filterUser)   params.set('userId', filterUser);
      if (filterAction) params.set('action', filterAction);
      if (filterFrom)   params.set('from', filterFrom);
      if (filterTo)     params.set('to', filterTo);
      if (filterJobId.trim()) params.set('jobId', filterJobId.trim());

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data: AuditLogResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
      setPage(data.page);
    } catch {
      setErr('Could not load audit records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterAction, filterFrom, filterTo, filterJobId]);

  // Re-fetch when filters change (reset to page 1)
  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  function handleRefresh() {
    fetchLogs(page);
  }

  function handlePrev() {
    if (page > 1) fetchLogs(page - 1);
  }

  function handleNext() {
    if (page < pages) fetchLogs(page + 1);
  }

  function clearFilters() {
    setFilterUser('');
    setFilterAction('');
    setFilterFrom('');
    setFilterTo('');
    setFilterJobId('');
  }

  function applyDateRange(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);
    setFilterFrom(from.toISOString().split('T')[0]);
    setFilterTo(to.toISOString().split('T')[0]);
  }

  const hasFilters = filterUser || filterAction || filterFrom || filterTo || filterJobId;
  const loadedWithLocation = logs.filter(log => log.latitude != null && log.longitude != null).length;
  const loadedDestructive = logs.filter(log => DESTRUCTIVE_ACTIONS.has(log.action)).length;
  const loadedUsers = new Set(logs.map(log => log.userId)).size;
  const latestLog = logs[0]?.createdAt;

  return (
    <div className="fi-anim">
      {/* Page Header */}
      <div className="page-hdr" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Audit Log</h1>
          <p>Track all user activity across the platform.</p>
        </div>
        <button
          className="btn btn-s btn-sm"
          onClick={handleRefresh}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Clock size={14} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="g4" style={{ marginBottom: 'var(--s6)' }}>
        <div className="tile">
          <div className="stat-v">{total}</div>
          <div className="stat-l">{hasFilters ? 'Matching records' : 'Total records'}</div>
        </div>
        <div className="tile">
          <div className="stat-v">{loadedUsers}</div>
          <div className="stat-l">Users on page</div>
        </div>
        <div className="tile">
          <div className="stat-v">{loadedWithLocation}</div>
          <div className="stat-l">With location</div>
        </div>
        <div className="tile">
          <div className="stat-v">{loadedDestructive}</div>
          <div className="stat-l">Destructive actions</div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="tile"
        style={{
          marginBottom: 'var(--s5)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--s3)',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--cds-text-secondary)', marginRight: 4 }}>
          <Filter size={14} />
          <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>Filters</span>
        </div>

        <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-end' }}>
          <button className="btn btn-g btn-sm" type="button" onClick={() => applyDateRange(1)}>Today</button>
          <button className="btn btn-g btn-sm" type="button" onClick={() => applyDateRange(7)}>7 days</button>
          <button className="btn btn-g btn-sm" type="button" onClick={() => applyDateRange(30)}>30 days</button>
        </div>

        {/* User filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 160 }}>
          <label style={{ fontSize: 11, color: 'var(--cds-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <UserIcon size={11} /> User
          </label>
          <select
            className="sel"
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">All users</option>
            {techs.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Action filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 160 }}>
          <label style={{ fontSize: 11, color: 'var(--cds-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={11} /> Action
          </label>
          <select
            className="sel"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.group} · {cfg.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 180 }}>
          <label style={{ fontSize: 11, color: 'var(--cds-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={11} /> Job ID
          </label>
          <input
            type="search"
            className="inp"
            value={filterJobId}
            onChange={e => setFilterJobId(e.target.value)}
            placeholder="Exact job id"
            style={{ minWidth: 180 }}
          />
        </div>

        {/* Date from */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 11, color: 'var(--cds-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> From
          </label>
          <input
            type="date"
            className="inp"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            style={{ minWidth: 140 }}
          />
        </div>

        {/* Date to */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 11, color: 'var(--cds-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> To
          </label>
          <input
            type="date"
            className="inp"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            style={{ minWidth: 140 }}
          />
        </div>

        {hasFilters && (
          <button
            className="btn btn-s btn-sm"
            onClick={clearFilters}
            style={{ alignSelf: 'flex-end' }}
          >
            Clear
          </button>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <div className="notif notif-i" style={{ marginBottom: 'var(--s4)' }}>
          <div>
            <div className="notif-title">Showing {logs.length} of {total} record{total !== 1 ? 's' : ''}</div>
            <div className="notif-body">
              Latest activity {latestLog ? formatDateTime(latestLog) : '—'} · Page {page} of {pages || 1}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div style={{
          padding: 'var(--s4)',
          marginBottom: 'var(--s4)',
          background: 'var(--cds-support-error, #ff8389)22',
          border: '1px solid var(--cds-support-error, #ff8389)',
          color: 'var(--cds-support-error, #ff8389)',
          fontSize: 13,
        }}>
          {err}
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} /> Time
                </span>
              </th>
              <th style={{ minWidth: 140 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserIcon size={13} /> User
                </span>
              </th>
              <th style={{ minWidth: 130 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={13} /> Action
                </span>
              </th>
              <th style={{ minWidth: 110 }}>Job ID</th>
              <th style={{ minWidth: 180 }}>Reason</th>
              <th style={{ minWidth: 120 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} /> Location
                </span>
              </th>
              <th style={{ minWidth: 130 }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: 0, border: 0 }}>
                  <Spinner />
                </td>
              </tr>
            )}

            {!loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: 'var(--s8, 48px)',
                    color: 'var(--cds-text-secondary)',
                    fontSize: 13,
                  }}
                >
                  No audit records found.
                </td>
              </tr>
            )}

            {!loading && logs.map(log => {
              const action = ACTION_CONFIG[log.action] ?? { label: log.action, color: 'var(--cds-text-secondary)', group: 'Other' };
              const hasLocation = log.latitude != null && log.longitude != null;

              return (
                <tr key={log.id}>
                  {/* Time */}
                  <td style={{ fontSize: 12, color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.createdAt)}
                  </td>

                  {/* User */}
                  <td style={{ fontWeight: 500 }}>{log.userName}</td>

                  {/* Action */}
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '.02em',
                      background: `${action.color}22`,
                      color: action.color,
                      border: `1px solid ${action.color}44`,
                    }}>
                      {action.label}
                    </span>
                  </td>

                  {/* Job ID */}
                  <td style={{ fontSize: 12, color: 'var(--cds-text-secondary)', fontFamily: 'monospace' }}>
                    {log.jobId ?? '—'}
                  </td>

                  {/* Reason */}
                  <td
                    style={{ fontSize: 12, color: 'var(--cds-text-secondary)', maxWidth: 260 }}
                    title={log.reason ?? undefined}
                  >
                    {log.reason ? (
                      <span style={{
                        display: 'inline-block',
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                      }}>
                        {log.reason}
                      </span>
                    ) : '—'}
                  </td>

                  {/* Location */}
                  <td style={{ fontSize: 12 }}>
                    {hasLocation ? (
                      <a
                        href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: 'var(--cds-interactive)',
                          textDecoration: 'none',
                          fontSize: 12,
                        }}
                      >
                        <MapPin size={12} />
                        View Map
                      </a>
                    ) : (
                      <span style={{ color: 'var(--cds-text-secondary)' }}>—</span>
                    )}
                  </td>

                  {/* IP Address */}
                  <td style={{ fontSize: 12, color: 'var(--cds-text-secondary)', fontFamily: 'monospace' }}>
                    {log.ipAddress ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'var(--s4)',
          padding: '0 var(--s1)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>
            Page {page} of {pages} &nbsp;·&nbsp; {total} record{total !== 1 ? 's' : ''} total
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-s btn-sm"
              onClick={handlePrev}
              disabled={page <= 1}
              style={{ opacity: page <= 1 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <button
              className="btn btn-s btn-sm"
              onClick={handleNext}
              disabled={page >= pages}
              style={{ opacity: page >= pages ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
