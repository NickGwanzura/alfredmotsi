'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Location, User as UserIcon, Time, Document, Filter } from '@carbon/icons-react';
import { User, AuditLogEntry } from '@/app/types';

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

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  login:        { label: 'Login',        color: 'var(--cds-interactive)' },
  view_job:     { label: 'Viewed Job',   color: 'var(--cds-support-success)' },
  edit_job:     { label: 'Edited Job',   color: '#f1c21b' },
  complete_job: { label: 'Completed Job',color: '#8a3ffc' },
};

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
  }, [filterUser, filterAction, filterFrom, filterTo]);

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
  }

  const hasFilters = filterUser || filterAction || filterFrom || filterTo;

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
          <Time size={14} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="g3" style={{ marginBottom: 'var(--s6)' }}>
        <div className="tile">
          <div className="stat-v">{total}</div>
          <div className="stat-l">Total Records</div>
        </div>
        <div className="tile">
          <div className="stat-v">{pages}</div>
          <div className="stat-l">Pages</div>
        </div>
        <div className="tile">
          <div className="stat-v">{page}</div>
          <div className="stat-l">Current Page</div>
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
            <Document size={11} /> Action
          </label>
          <select
            className="sel"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">All actions</option>
            <option value="login">Login</option>
            <option value="view_job">Viewed Job</option>
            <option value="edit_job">Edited Job</option>
            <option value="complete_job">Completed Job</option>
          </select>
        </div>

        {/* Date from */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 11, color: 'var(--cds-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Time size={11} /> From
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
            <Time size={11} /> To
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
                  <Time size={13} /> Time
                </span>
              </th>
              <th style={{ minWidth: 140 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserIcon size={13} /> User
                </span>
              </th>
              <th style={{ minWidth: 130 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Document size={13} /> Action
                </span>
              </th>
              <th style={{ minWidth: 110 }}>Job ID</th>
              <th style={{ minWidth: 120 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Location size={13} /> Location
                </span>
              </th>
              <th style={{ minWidth: 130 }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 0 }}>
                  <Spinner />
                </td>
              </tr>
            )}

            {!loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
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
              const action = ACTION_CONFIG[log.action] ?? { label: log.action, color: 'var(--cds-text-secondary)' };
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
                        <Location size={12} />
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
