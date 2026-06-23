'use client';

import React, { useState, useMemo } from 'react';
import { CRMRecord, Customer, CRMType, CRMOutcome } from '@/app/types';
import { SectionTitle, CRMOutcomeTag } from './ui';
import { MessageSquare, Building2, AlertTriangle, Mail, DollarSign, Users, CalendarDays, Plus, Clock } from 'lucide-react';

interface CRMProps {
  records: CRMRecord[];
  customers: Customer[];
  onAdd?: (record: CRMRecord) => void;
}

const CRM_TYPE_CONFIG: Record<CRMType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  call: { label: 'Call', icon: <MessageSquare size={14} />, color: 'text-blue-700', bg: 'bg-blue-100' },
  visit: { label: 'Visit', icon: <Building2 size={14} />, color: 'text-emerald-700', bg: 'bg-emerald-100' },
  complaint: { label: 'Complaint', icon: <AlertTriangle size={14} />, color: 'text-red-700', bg: 'bg-red-100' },
  email: { label: 'Email', icon: <Mail size={14} />, color: 'text-purple-700', bg: 'bg-purple-100' },
  quote: { label: 'Quote', icon: <DollarSign size={14} />, color: 'text-amber-700', bg: 'bg-amber-100' },
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
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Relationship Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredRecords.length} records</p>
        </div>
        {onAdd && customers.length > 0 && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
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
            <Plus size={16} /> Add Record
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Interactions</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"><Users size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">This Month</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm"><CalendarDays size={18} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.thisMonth}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Pending Follow-ups</span>
            <div className={`p-2 rounded-lg shadow-sm text-white ${stats.overdueFollowUps > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-amber-500 to-amber-600'}`}>
              <Clock size={18} />
            </div>
          </div>
          <p className={`text-3xl font-bold tracking-tight ${stats.overdueFollowUps > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.pendingFollowUps}</p>
          {stats.overdueFollowUps > 0 && <p className="text-xs text-red-500 font-semibold mt-1">{stats.overdueFollowUps} overdue</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="min-w-[180px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Filter by Type</label>
            <select className="h-9 w-full px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
              value={typeFilter} onChange={e => setTypeFilter(e.target.value as CRMType | 'all')}>
              <option value="all">All Types</option>
              {(['call', 'visit', 'complaint', 'email', 'quote'] as CRMType[]).map(t => <option key={t} value={t}>{CRM_TYPE_CONFIG[t].label}</option>)}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Filter by Outcome</label>
            <select className="h-9 w-full px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
              value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value as CRMOutcome | 'all')}>
              <option value="all">All Outcomes</option>
              <option value="positive">Positive</option><option value="negative">Negative</option>
              <option value="pending">Pending</option><option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No records found matching your filters.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const followUpOverdue = !record.followUpDone && isOverdue(record.followUp);
            const typeConfig = CRM_TYPE_CONFIG[record.type];
            return (
              <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${typeConfig.bg} ${typeConfig.color} shrink-0`}>{typeConfig.icon}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{record.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{getCustomerName(record.customerId, customers)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CRMOutcomeTag outcome={record.outcome} />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>{formatDate(record.date)}</span>
                  <span>by {record.by}</span>
                  {record.followUp && (
                    <span className={followUpOverdue ? 'text-red-500 font-semibold' : ''}>
                      Follow-up: {formatDate(record.followUp)}{followUpOverdue ? ' (Overdue)' : ''}
                      {record.followUpDone && <span className="text-emerald-500 ml-1">\u2713</span>}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
