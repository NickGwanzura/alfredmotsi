'use client';

import React, { useState, useMemo } from 'react';
import { GasUsageRecord, User } from '@/app/types';
import { SectionTitle, ContextBanner } from './ui';
import { Beaker, CalendarDays, TrendingUp, Plus, Download, FileText, Search } from 'lucide-react';
import { useToast } from './Toast';
import { makeCsv } from '@/app/lib/csv';
import { isAdmin } from '@/app/lib/permissions';

interface GasUsageProps {
  usage: GasUsageRecord[];
  currentUser: User;
  onAdd?: (record: GasUsageRecord) => void;
  jobs?: { id: string; title: string; jobCardRef: string }[];
  techs?: { id: string; name: string }[];
  onRefresh?: () => void;
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

function getJobRef(jobId: string | null, jobs?: { id: string; jobCardRef: string }[]): string {
  if (!jobId) return 'Stock only';
  const j = jobs?.find(j => j.id === jobId);
  return j?.jobCardRef || jobId.slice(0, 8);
}

function getTechName(usedBy: string | null, usedByName: string, techs?: { id: string; name: string }[]): string {
  const t = techs?.find(t => t.id === usedBy);
  return t?.name || usedByName || 'Unknown';
}

export default function GasUsage({ usage, currentUser, onAdd, jobs, techs, onRefresh }: GasUsageProps) {
  const { success, warning } = useToast();
  const [gasFilter, setGasFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const gasTypes = useMemo(() => Array.from(new Set(usage.map(u => u.gasType))).sort(), [usage]);

  const filteredUsage = useMemo(() => {
    let result = gasFilter === 'all' ? usage : usage.filter(u => u.gasType === gasFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.customer || '').toLowerCase().includes(q) ||
        (u.purpose || '').toLowerCase().includes(q) ||
        getJobRef(u.jobId, jobs).toLowerCase().includes(q) ||
        getTechName(u.usedBy, u.usedByName, techs).toLowerCase().includes(q) ||
        u.gasType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [usage, gasFilter, search, jobs, techs]);

  const activeServiceMovements = useMemo(() => filteredUsage.filter(u => !u.reversedAt && ['used', 'reused', 'recovered'].includes(u.movementType)), [filteredUsage]);
  const totalUsage = useMemo(() => activeServiceMovements.filter(u => u.movementType !== 'recovered').reduce((sum, u) => sum + u.quantityKg, 0), [activeServiceMovements]);
  const thisMonthUsage = useMemo(() => {
    const now = new Date();
    return activeServiceMovements.filter(u => u.movementType !== 'recovered' && (() => { const d = new Date(`${u.date}T00:00:00`); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })()).reduce((sum, u) => sum + u.quantityKg, 0);
  }, [activeServiceMovements]);
  const topGasType = useMemo(() => {
    const byType: Record<string, number> = {};
    activeServiceMovements.filter(u => u.movementType !== 'recovered').forEach(u => { byType[u.gasType] = (byType[u.gasType] || 0) + u.quantityKg; });
    let maxType = '—', maxQty = 0;
    Object.entries(byType).forEach(([type, qty]) => { if (qty > maxQty) { maxQty = qty; maxType = type; } });
    return maxType;
  }, [activeServiceMovements]);

  const sortedUsage = useMemo(() => [...filteredUsage].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()), [filteredUsage]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Movement', 'Gas Type', 'Entered Quantity', 'Unit', 'Quantity (kg)', 'Stock Delta', 'Balance After', 'Technician', 'Customer', 'Job Ref', 'Purpose', 'Reversed'];
    const rows = sortedUsage.map(u => [
      u.date, u.time, u.movementType, u.gasType, u.quantityUsed, u.unit, u.quantityKg.toFixed(3), u.stockDelta,
      u.stockBalanceAfter ?? '', getTechName(u.usedBy, u.usedByName, techs), u.customer,
      getJobRef(u.jobId, jobs), u.purpose, u.reversedAt ? `Yes: ${u.reversalReason || ''}` : 'No',
    ]);
    const csv = makeCsv([headers, ...rows]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gas-usage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success('CSV exported', `${rows.length} records downloaded`);
  };

  const reverseMovement = async (record: GasUsageRecord) => {
    const reason = window.prompt('Reason for reversing this movement:')?.trim();
    if (!reason) return;
    const response = await fetch(`/api/gas-usage/${record.id}/reverse`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) { warning('Reversal failed', data?.error || `Server error ${response.status}`); return; }
    success('Movement reversed', 'Stock and ODS totals were restored.');
    onRefresh?.();
  };

  const handleExportPDF = async () => {
    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/gas-usage/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usage: sortedUsage.map(({ id }) => ({ id })) }) });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gas-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        success('PDF exported', 'Gas usage report downloaded');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to generate PDF' }));
        warning('Export failed', err.error);
      }
    } catch {
      warning('Export failed', 'Network error');
    }
    setGeneratingPdf(false);
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      <ContextBanner title="Refrigerant Gas Usage Tracking" icon={<Beaker size={18} />}>
        <p>Every time refrigerant is used on a job, it is recorded here and <strong>automatically deducted</strong> from gas stock inventory. Use <strong>CSV</strong> or <strong>PDF</strong> export for compliance reporting.</p>
        <p className="mt-1">To log usage, open a <strong>Job Card</strong> → <strong>ODS tab</strong> or click <strong>Record Usage</strong> above. Records include customer, technician, job reference, and purpose.</p>
      </ContextBanner>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gas Usage Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredUsage.length} records</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors border-none cursor-pointer">
            <Download size={16} /> CSV
          </button>
          <button onClick={handleExportPDF} disabled={generatingPdf} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors border-none cursor-pointer disabled:opacity-50">
            <FileText size={16} /> {generatingPdf ? 'Generating...' : 'PDF'}
          </button>
          {onAdd && (
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
              onClick={() => {
                onAdd({ id: '', stockId: null, gasType: '', quantityUsed: 0, quantityKg: 0, unit: 'kg', stockDelta: 0, movementType: 'used', usedBy: currentUser.id || null, usedByName: currentUser.name, jobId: null, customer: '', date: '', time: '', purpose: '' });
              }}>
              <Plus size={16} /> Record Usage
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
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
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <SectionTitle>Usage Records</SectionTitle>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-48 h-9 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Search by customer, gas, tech..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-600 cursor-pointer"
              value={gasFilter} onChange={e => setGasFilter(e.target.value)}>
              <option value="all">All gas types</option>
              {gasTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
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
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Date / Time</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Gas Type</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Movement</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Quantity</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Technician</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Customer</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Job Ref</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Purpose</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Status</th>
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
                    <td className="px-4 py-3 text-sm font-semibold capitalize text-gray-700">{u.movementType}</td>
                    <td className="px-4 py-3"><span className="font-mono text-sm font-semibold text-gray-900">{u.quantityUsed.toFixed(2)} {u.unit}</span><div className="text-xs text-gray-400">{u.quantityKg.toFixed(3)} kg</div></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getTechName(u.usedBy, u.usedByName, techs)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.customer}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-brand-600 font-semibold">{getJobRef(u.jobId, jobs)}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px]">{u.purpose || '—'}</td>
                    <td className="px-4 py-3 text-sm">{u.reversedAt ? <span className="text-red-600">Reversed</span> : isAdmin(currentUser.role) && !['reversal'].includes(u.movementType) ? <button className="text-xs text-red-600 bg-transparent border-none cursor-pointer" onClick={() => reverseMovement(u)}>Reverse</button> : <span className="text-emerald-600">Active</span>}</td>
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
