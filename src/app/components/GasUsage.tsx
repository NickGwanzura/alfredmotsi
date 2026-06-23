'use client';

import React, { useState, useMemo } from 'react';
import { GasUsageRecord, User } from '@/app/types';
import { SectionTitle } from './ui';
import { canManageGasUsage } from '@/app/lib/permissions';
import { Beaker, CalendarDays, TrendingUp, Plus, Download } from 'lucide-react';

interface GasUsageProps {
  usage: GasUsageRecord[];
  currentUser: User;
  onExport?: () => void;
  onAdd?: (record: GasUsageRecord) => void;
  stock?: { id: string; gasType: string; remaining: number; unit: string }[];
  customers?: { id: string; name: string }[];
  jobs?: { id: string; title: string; jobCardRef: string }[];
}

const GAS_TYPE_COLORS: Record<string, string> = {
  'R-32': 'bg-blue-100 text-blue-700', 'R-410A': 'bg-purple-100 text-purple-700',
  'R-22': 'bg-red-100 text-red-700', 'R-134a': 'bg-cyan-100 text-cyan-700',
  'R-407C': 'bg-amber-100 text-amber-700', 'R-600A': 'bg-emerald-100 text-emerald-700',
  'R-290': 'bg-orange-100 text-orange-700',
};

function getGasTypePill(type: string): string {
  return GAS_TYPE_COLORS[type] || 'bg-gray-100 text-gray-700';
}

export default function GasUsage({ usage, currentUser, onExport, onAdd, stock }: GasUsageProps) {
  if (!canManageGasUsage(currentUser.role)) return null;
  const [gasFilter, setGasFilter] = useState<string>('all');
  const gasTypes = useMemo(() => Array.from(new Set(usage.map(u => u.gasType))).sort(), [usage]);
  const filteredUsage = useMemo(() => gasFilter === 'all' ? usage : usage.filter(u => u.gasType === gasFilter), [usage, gasFilter]);
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
  const sortedUsage = useMemo(() => [...filteredUsage].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()), [filteredUsage]);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gas Usage Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredUsage.length} records</p>
        </div>
        <div className="flex items-center gap-3">
          {onExport && (
            <button onClick={onExport} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors border-none cursor-pointer">
              <Download size={16} /> Export CSV
            </button>
          )}
          {onAdd && (
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
              onClick={() => {
                onAdd({ id: '', stockId: stock?.[0]?.id || '', gasType: stock?.[0]?.gasType || '', quantityUsed: 0, usedBy: '', jobId: '', customer: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), purpose: '' });
              }}>
              <Plus size={16} /> Record Usage
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Usage', value: totalUsage.toFixed(2), sub: 'kg', icon: Beaker, color: 'from-blue-500 to-blue-600' },
          { label: 'This Month', value: thisMonthUsage.toFixed(2), sub: 'kg', icon: CalendarDays, color: 'from-violet-500 to-violet-600' },
          { label: 'Top Gas Type', value: topGasType, sub: 'most used', icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}><s.icon size={18} /></div>
            </div>
            <p className={`text-3xl font-bold text-gray-900 tracking-tight ${i < 2 ? 'font-mono' : ''}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Usage Records</SectionTitle>
          <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-600 cursor-pointer"
            value={gasFilter} onChange={e => setGasFilter(e.target.value)}>
            <option value="all">All gas types</option>
            {gasTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {sortedUsage.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Beaker size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No usage records match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Date</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Gas Type</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Quantity (kg)</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Used By</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Customer</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Job ID</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsage.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{u.date}</div>
                      <div className="text-xs text-gray-400 font-mono">{u.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${getGasTypePill(u.gasType)}`}>{u.gasType}</span>
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-sm font-semibold text-gray-900">{u.quantityUsed.toFixed(2)}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.usedBy}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.customer}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-gray-400">{u.jobId}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{u.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
