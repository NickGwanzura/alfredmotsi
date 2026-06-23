'use client';

import React, { useState, useMemo } from 'react';
import { GasUsageRecord, User } from '@/app/types';
import { SectionTitle } from './ui';
import { canManageGasUsage } from '@/app/lib/permissions';

interface GasUsageProps {
  usage: GasUsageRecord[];
  currentUser: User;
  onExport?: () => void;
  onAdd?: (record: GasUsageRecord) => void;
  stock?: { id: string; gasType: string; remaining: number; unit: string }[];
  customers?: { id: string; name: string }[];
  jobs?: { id: string; title: string; jobCardRef: string }[];
}

export default function GasUsage({ usage, currentUser, onExport, onAdd, stock, customers, jobs }: GasUsageProps) {
  if (!canManageGasUsage(currentUser.role)) return null;
  const [gasFilter, setGasFilter] = useState<string>('all');

  const gasTypes = useMemo(() => {
    const types = new Set(usage.map(u => u.gasType));
    return Array.from(types).sort();
  }, [usage]);

  const filteredUsage = useMemo(() => {
    if (gasFilter === 'all') return usage;
    return usage.filter(u => u.gasType === gasFilter);
  }, [usage, gasFilter]);

  const totalUsage = useMemo(() => filteredUsage.reduce((sum, u) => sum + u.quantityUsed, 0), [filteredUsage]);
  const thisMonthUsage = useMemo(() => {
    const now = new Date();
    return filteredUsage.filter(u => { const d = new Date(u.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, u) => sum + u.quantityUsed, 0);
  }, [filteredUsage]);
  const topGasType = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredUsage.forEach(u => { byType[u.gasType] = (byType[u.gasType] || 0) + u.quantityUsed; });
    let maxType = '—', maxQty = 0;
    Object.entries(byType).forEach(([type, qty]) => { if (qty > maxQty) { maxQty = qty; maxType = type; } });
    return maxType;
  }, [filteredUsage]);

  const sortedUsage = useMemo(() => {
    return [...filteredUsage].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [filteredUsage]);

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">Gas Usage Log</h1>
        <p className="text-sm text-text-secondary">{filteredUsage.length} records</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{totalUsage.toFixed(2)}</div>
          <div className="text-xs text-text-secondary mt-1">Total Usage (kg)</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{thisMonthUsage.toFixed(2)}</div>
          <div className="text-xs text-text-secondary mt-1">This Month</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{topGasType}</div>
          <div className="text-xs text-text-secondary mt-1">Top Gas Type</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <SectionTitle>Usage Records</SectionTitle>
        <div className="flex gap-2 items-center">
          <select className="w-[160px] h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={gasFilter} onChange={e => setGasFilter(e.target.value)}>
            <option value="all">All gas types</option>
            {gasTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          {onAdd && (
            <button className="inline-flex items-center px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors" onClick={() => {
              const emptyRecord: GasUsageRecord = {
                id: '', stockId: stock?.[0]?.id || '', gasType: stock?.[0]?.gasType || '',
                quantityUsed: 0, usedBy: '', jobId: '', customer: '',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                purpose: '',
              };
              onAdd(emptyRecord);
            }}>
              + Record Usage
            </button>
          )}
          {onExport && <button className="inline-flex items-center px-3 py-1.5 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={onExport}>Export CSV</button>}
        </div>
      </div>

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface">
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Date</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Gas Type</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Quantity (kg)</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Used By</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Customer</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Job ID</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsage.map(u => (
              <tr key={u.id} className="border-b border-border-subtle hover:bg-surface-hover transition-colors">
                <td className="mono text-xs text-text-secondary px-4 py-3 whitespace-nowrap">{u.date}<br/>{u.time}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{u.gasType}</td>
                <td className="mono px-4 py-3 text-text-primary">{u.quantityUsed.toFixed(2)}</td>
                <td className="px-4 py-3 text-text-secondary">{u.usedBy}</td>
                <td className="px-4 py-3 text-text-secondary">{u.customer}</td>
                <td className="mono text-xs text-text-secondary px-4 py-3">{u.jobId}</td>
                <td className="px-4 py-3 text-text-secondary max-w-[200px]">{u.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedUsage.length === 0 && (
          <div className="p-8 text-center text-text-helper text-sm">No usage records match your filter criteria.</div>
        )}
      </div>
    </div>
  );
}
