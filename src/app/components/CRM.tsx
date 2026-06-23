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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  return customers.find(c => c.id === customerId)?.name || 'Unknown Customer';
}

export default function CRM({ records, customers, onAdd }: CRMProps) {
  const [typeFilter, setTypeFilter] = useState<CRMType | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<CRMOutcome | 'all'>('all');

  const stats = useMemo(() => {
    const total = records.length;
    const thisMonth = records.filter(r => isThisMonth(r.date)).length;
    const pendingFollowUps = records.filter(r => !r.followUpDone && new Date(r.followUp) >= new Date()).length;
    const overdueFollowUps = records.filter(r => !r.followUpDone && isOverdue(r.followUp)).length;
    return { total, thisMonth, pendingFollowUps, overdueFollowUps };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => typeFilter === 'all' ? true : r.type === typeFilter)
      .filter(r => outcomeFilter === 'all' ? true : r.outcome === outcomeFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, typeFilter, outcomeFilter]);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Customer Relationship Management</h1>
          <p className="text-sm text-text-secondary">{filteredRecords.length} records</p>
        </div>
        {onAdd && customers.length > 0 && (
          <button className="inline-flex items-center px-4 py-2 text-sm bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors"
            onClick={() => {
              const now = new Date();
              onAdd({
                id: '', customerId: customers[0]?.id || '', type: 'call', subject: '', body: '',
                date: now.toISOString().split('T')[0],
                time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                by: '', followUp: '', followUpDone: false, outcome: 'pending',
              });
            }}
          >
            + Add Record
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{stats.total}</div>
          <div className="text-xs text-text-secondary mt-1">Total Interactions</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{stats.thisMonth}</div>
          <div className="text-xs text-text-secondary mt-1">This Month</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-support-warning">
          <div className="text-3xl font-bold" style={{ color: stats.overdueFollowUps > 0 ? 'var(--color-support-error)' : undefined }}>
            {stats.pendingFollowUps}
          </div>
          <div className="text-xs text-text-secondary mt-1">Pending Follow-ups</div>
          {stats.overdueFollowUps > 0 && (
            <div className="text-xs text-support-error mt-1">{stats.overdueFollowUps} overdue</div>
          )}
        </div>
      </div>

      <div className="bg-layer p-4 border border-border-subtle mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SectionTitle>Filter by Type</SectionTitle>
          <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors"
            value={typeFilter} onChange={e => setTypeFilter(e.target.value as CRMType | 'all')}>
            <option value="all">All Types</option>
            {(['call', 'visit', 'complaint', 'email', 'quote'] as CRMType[]).map(t => <option key={t} value={t}>{CRM_TYPE_CONFIG[t].label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <SectionTitle>Filter by Outcome</SectionTitle>
          <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors"
            value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value as CRMOutcome | 'all')}>
            <option value="all">All Outcomes</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface">
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Date</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Customer</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Type</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Subject</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">By</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Follow-up</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map(record => {
              const followUpOverdue = !record.followUpDone && isOverdue(record.followUp);
              const typeConfig = CRM_TYPE_CONFIG[record.type];
              return (
                <tr key={record.id} className="border-b border-border-subtle hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm text-text-primary">{formatDate(record.date)}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{getCustomerName(record.customerId, customers)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center h-6 px-2 text-[11px] font-medium rounded" style={{ background: `${typeConfig.color}22`, color: typeConfig.color }}>
                      {typeConfig.icon} {typeConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">{record.subject}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{record.by}</td>
                  <td className="px-4 py-3 text-sm">
                    {record.followUp ? (
                      <span style={{ color: followUpOverdue ? 'var(--color-support-error)' : undefined, fontWeight: followUpOverdue ? 600 : 400 }}>
                        {formatDate(record.followUp)}
                        {record.followUpDone && <span className="text-support-success ml-1">✓</span>}
                        {followUpOverdue && <span className="ml-1">(Overdue)</span>}
                      </span>
                    ) : (
                      <span className="text-text-helper">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><CRMOutcomeTag outcome={record.outcome} /></td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr><td colSpan={7} className="text-center text-text-helper p-6 text-sm">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
