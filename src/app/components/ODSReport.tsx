'use client';

import React, { useMemo, useState } from 'react';
import { GasUsageRecord, Job } from '@/app/types';
import { REFRIGERANT_TYPES } from '@/app/lib/config';
import { isActiveServiceMovement } from '@/app/lib/gasLedger';
import { SectionTitle } from './ui';
import { makeCsv } from '@/app/lib/csv';
import { Leaf, Download, Recycle, AlertTriangle, BarChart3 } from 'lucide-react';

interface ODSReportProps {
  movements: GasUsageRecord[];
  jobs: Job[];
}

export default function ODSReport({ movements, jobs }: ODSReportProps) {
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const active = useMemo(() => movements.filter(isActiveServiceMovement), [movements]);
  const filtered = useMemo(() => active.filter(record =>
    (selectedRefrigerant === 'all' || record.gasType === selectedRefrigerant)
    && (!fromDate || record.date >= fromDate)
    && (!toDate || record.date <= toDate)), [active, selectedRefrigerant, fromDate, toDate]);
  const total = (type: GasUsageRecord['movementType']) => filtered
    .filter(record => record.movementType === type)
    .reduce((sum, record) => sum + record.quantityKg, 0);
  const totalRecovered = total('recovered');
  const totalUsed = total('used');
  const totalReused = total('reused');
  const r22RecoveryCount = filtered.filter(record => record.gasType === 'R-22' && record.movementType === 'recovered').length;
  const getJobRef = (jobId: string | null) => jobs.find(job => job.id === jobId)?.jobCardRef || jobId || '—';

  const exportReport = () => {
    const rows = filtered.map(record => [
      record.date, record.time, getJobRef(record.jobId), record.customer, record.gasType,
      record.movementType, record.stockSerialNumber || '', record.quantityUsed, record.unit, record.quantityKg.toFixed(3),
      record.usedByName, record.purpose,
    ]);
    const csv = makeCsv([['Date', 'Time', 'Job Ref', 'Customer', 'Refrigerant', 'Movement', 'Cylinder Serial', 'Entered Quantity', 'Unit', 'Quantity (kg)', 'Recorded By', 'Purpose'], ...rows]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ods-movement-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 rounded-xl p-8 mb-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/20 text-white"><Leaf size={24} /></div>
          <div><h1 className="text-2xl font-bold text-white">ODS Compliance Report</h1><p className="text-emerald-100 text-sm mt-1">Ledger-derived refrigerant recovery, use, and reuse</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Recovered', value: totalRecovered.toFixed(2), sub: 'kg', icon: Recycle, color: 'from-emerald-500 to-emerald-600' },
          { label: 'New Gas Used', value: totalUsed.toFixed(2), sub: 'kg', icon: BarChart3, color: 'from-blue-500 to-blue-600' },
          { label: 'Recovered Gas Reused', value: totalReused.toFixed(2), sub: 'kg', icon: Recycle, color: 'from-purple-500 to-purple-600' },
          { label: 'R-22 Recovery', value: String(r22RecoveryCount), sub: 'movement records', icon: AlertTriangle, color: 'from-amber-500 to-amber-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4"><span className="text-sm font-medium text-gray-500">{card.label}</span><div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white`}><card.icon size={18} /></div></div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight font-mono">{card.value}</p><p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-3"><div className="min-w-[220px]"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Filter by Refrigerant</label><select className="h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white" value={selectedRefrigerant} onChange={event => setSelectedRefrigerant(event.target.value)}><option value="all">All Refrigerants</option>{REFRIGERANT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div><label className="text-xs font-semibold uppercase tracking-wider text-gray-500">From<input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-1.5 block h-11 rounded-lg border border-gray-200 px-3 text-sm font-normal normal-case" /></label><label className="text-xs font-semibold uppercase tracking-wider text-gray-500">To<input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-1.5 block h-11 rounded-lg border border-gray-200 px-3 text-sm font-normal normal-case" /></label></div>
        <button onClick={exportReport} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg border-none cursor-pointer"><Download size={16} /> Export Complete Ledger</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5"><SectionTitle>Auditable Movement Records</SectionTitle></div>
        <div className="overflow-x-auto"><table className="w-full border-collapse">
          <thead><tr className="bg-gray-50">{['Date', 'Job', 'Customer', 'Refrigerant', 'Movement', 'Cylinder', 'Entered', 'Canonical kg', 'Recorded By', 'Purpose'].map(label => <th key={label} className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">{label}</th>)}</tr></thead>
          <tbody>{filtered.length === 0 ? <tr><td colSpan={10} className="text-center py-10 text-sm text-gray-400">No ODS movements found.</td></tr> : filtered.map(record => (
            <tr key={record.id} className="border-b border-gray-100">
              <td className="px-4 py-3 text-sm whitespace-nowrap">{record.date} {record.time}</td><td className="px-4 py-3 font-mono text-xs">{getJobRef(record.jobId)}</td><td className="px-4 py-3 text-sm">{record.customer}</td><td className="px-4 py-3 text-sm font-semibold">{record.gasType}</td><td className="px-4 py-3 text-sm capitalize">{record.movementType}</td><td className="px-4 py-3 font-mono text-xs">{record.stockSerialNumber || '—'}</td><td className="px-4 py-3 font-mono text-sm">{record.quantityUsed} {record.unit}</td><td className="px-4 py-3 font-mono text-sm">{record.quantityKg.toFixed(3)}</td><td className="px-4 py-3 text-sm">{record.usedByName}</td><td className="px-4 py-3 text-sm text-gray-500">{record.purpose}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>

      <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="text-xs text-emerald-800 m-0"><strong>Reuse rate:</strong> {totalRecovered > 0 ? ((totalReused / totalRecovered) * 100).toFixed(1) : '0.0'}%. Reversed and administrative adjustment records are excluded from ODS totals but retained in the gas movement ledger.</p></div>
    </div>
  );
}
