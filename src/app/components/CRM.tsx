'use client';

import React, { useState, useMemo } from 'react';
import { CRMRecord, Customer, CRMType, CRMOutcome } from '@/app/types';
import { SectionTitle, CRMOutcomeTag } from './ui';

interface CRMProps {
  records: CRMRecord[];
  customers: Customer[];
  onAdd?: (record: CRMRecord) => void;
}

const CRM_TYPE_CONFIG: Record<CRMType, { label: string; icon: string; color: string }> = {
  call: { label: 'Call', icon: '📞', color: '#0f62fe' },
  visit: { label: 'Visit', icon: '🏢', color: '#198038' },
  complaint: { label: 'Complaint', icon: '⚠', color: '#da1e28' },
  email: { label: 'Email', icon: '✉', color: '#8a3ffc' },
  quote: { label: 'Quote', icon: '$', color: '#b28600' },
};

const CRM_OUTCOME_CONFIG: Record<CRMOutcome, { label: string; color: string }> = {
  positive: { label: 'Positive', color: '#198038' },
  negative: { label: 'Negative', color: '#da1e28' },
  pending: { label: 'Pending', color: '#b28600' },
  resolved: { label: 'Resolved', color: '#0f62fe' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dateStr: string): boolean {
  const followUp = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return followUp < today;
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function getCustomerName(customerId: string, customers: Customer[]): string {
  const customer = customers.find((c) => c.id === customerId);
  return customer?.name || 'Unknown Customer';
}

export default function CRM({ records, customers, onAdd }: CRMProps) {
  const [typeFilter, setTypeFilter] = useState<CRMType | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<CRMOutcome | 'all'>('all');

  const stats = useMemo(() => {
    const total = records.length;
    const thisMonth = records.filter((r) => isThisMonth(r.date)).length;
    const pendingFollowUps = records.filter(
      (r) => !r.followUpDone && new Date(r.followUp) >= new Date()
    ).length;
    const overdueFollowUps = records.filter(
      (r) => !r.followUpDone && isOverdue(r.followUp)
    ).length;

    return { total, thisMonth, pendingFollowUps, overdueFollowUps };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => (typeFilter === 'all' ? true : r.type === typeFilter))
      .filter((r) => (outcomeFilter === 'all' ? true : r.outcome === outcomeFilter))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, typeFilter, outcomeFilter]);

  return (
    <div className="fi-anim">
      <div className="page-hdr">
        <h1>Customer Relationship Management</h1>
      </div>

      {/* Stats */}
      <div className="g3" style={{ marginBottom: 'var(--s6)' }}>
        <div className="tile">
          <div className="stat-v">{stats.total}</div>
          <div className="stat-l">Total Interactions</div>
        </div>
        <div className="tile">
          <div className="stat-v">{stats.thisMonth}</div>
          <div className="stat-l">This Month</div>
        </div>
        <div className="tile">
          <div className="stat-v" style={{ color: stats.overdueFollowUps > 0 ? 'var(--se)' : undefined }}>
            {stats.pendingFollowUps}
          </div>
          <div className="stat-l">Pending Follow-ups</div>
          {stats.overdueFollowUps > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--se)', marginTop: '4px' }}>
              {stats.overdueFollowUps} overdue
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        className="tile"
        style={{ marginBottom: 'var(--s6)', display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SectionTitle>Filter by Type</SectionTitle>
          <select
            className="sel"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CRMType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="call">Call</option>
            <option value="visit">Visit</option>
            <option value="complaint">Complaint</option>
            <option value="email">Email</option>
            <option value="quote">Quote</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SectionTitle>Filter by Outcome</SectionTitle>
          <select
            className="sel"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as CRMOutcome | 'all')}
          >
            <option value="all">All Outcomes</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Subject</th>
              <th>By</th>
              <th>Follow-up</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const followUpOverdue = !record.followUpDone && isOverdue(record.followUp);
              const typeConfig = CRM_TYPE_CONFIG[record.type];

              return (
                <tr key={record.id}>
                  <td>{formatDate(record.date)}</td>
                  <td>{getCustomerName(record.customerId, customers)}</td>
                  <td>
                    <span
                      className="tag"
                      style={{
                        background: `${typeConfig.color}22`,
                        color: typeConfig.color,
                      }}
                    >
                      {typeConfig.icon} {typeConfig.label}
                    </span>
                  </td>
                  <td>{record.subject}</td>
                  <td>{record.by}</td>
                  <td>
                    {record.followUp ? (
                      <span
                        style={{
                          color: followUpOverdue ? 'var(--se)' : 'var(--tp)',
                          fontWeight: followUpOverdue ? 600 : 400,
                        }}
                      >
                        {formatDate(record.followUp)}
                        {record.followUpDone && (
                          <span style={{ color: 'var(--ss)', marginLeft: '4px' }}>✓</span>
                        )}
                        {followUpOverdue && (
                          <span style={{ marginLeft: '4px' }}>(Overdue)</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--tt)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <CRMOutcomeTag outcome={record.outcome} />
                  </td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', color: 'var(--tt)', padding: 'var(--s6)' }}
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
