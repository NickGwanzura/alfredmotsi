'use client';

import React, { useState, useMemo } from 'react';
import { GasUsageRecord } from '@/app/types';
import { SectionTitle } from './ui';

interface GasUsageProps {
  usage: GasUsageRecord[];
  onExport?: () => void;
}

export default function GasUsage({ usage, onExport }: GasUsageProps) {
  const [gasFilter, setGasFilter] = useState<string>('all');

  const gasTypes = useMemo(() => {
    const types = new Set(usage.map(u => u.gasType));
    return Array.from(types).sort();
  }, [usage]);

  const filteredUsage = useMemo(() => {
    if (gasFilter === 'all') return usage;
    return usage.filter(u => u.gasType === gasFilter);
  }, [usage, gasFilter]);

  const totalUsage = useMemo(() => {
    return filteredUsage.reduce((sum, u) => sum + u.quantityUsed, 0);
  }, [filteredUsage]);

  const thisMonthUsage = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return filteredUsage
      .filter(u => {
        const d = new Date(u.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, u) => sum + u.quantityUsed, 0);
  }, [filteredUsage]);

  const topGasType = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredUsage.forEach(u => {
      byType[u.gasType] = (byType[u.gasType] || 0) + u.quantityUsed;
    });
    
    let maxType = '—';
    let maxQty = 0;
    
    Object.entries(byType).forEach(([type, qty]) => {
      if (qty > maxQty) {
        maxQty = qty;
        maxType = type;
      }
    });
    
    return maxType;
  }, [filteredUsage]);

  const sortedUsage = useMemo(() => {
    return [...filteredUsage].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateB - dateA;
    });
  }, [filteredUsage]);

  return (
    <div className="fi-anim">
      <div className="page-hdr">
        <h1>Gas Usage Log</h1>
        <p>{filteredUsage.length} records</p>
      </div>

      <div className="g3" style={{ marginBottom: 'var(--cds-spacing-06)' }}>
        <div className="tile">
          <div className="stat-v">{totalUsage.toFixed(2)}</div>
          <div className="stat-l">Total Usage (kg)</div>
        </div>
        <div className="tile">
          <div className="stat-v">{thisMonthUsage.toFixed(2)}</div>
          <div className="stat-l">This Month</div>
        </div>
        <div className="tile">
          <div className="stat-v">{topGasType}</div>
          <div className="stat-l">Top Gas Type</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--cds-spacing-05)', flexWrap: 'wrap', gap: 'var(--cds-spacing-03)' }}>
        <SectionTitle>Usage Records</SectionTitle>
        <div style={{ display: 'flex', gap: 'var(--cds-spacing-03)', alignItems: 'center' }}>
          <select
            className="sel"
            style={{ width: 160 }}
            value={gasFilter}
            onChange={e => setGasFilter(e.target.value)}
          >
            <option value="all">All gas types</option>
            {gasTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {onExport && (
            <button className="btn btn-s btn-sm" onClick={onExport}>
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Gas Type</th>
              <th>Quantity (kg)</th>
              <th>Used By</th>
              <th>Customer</th>
              <th>Job ID</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsage.map(u => (
              <tr key={u.id}>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                  {u.date}<br/>{u.time}
                </td>
                <td style={{ fontWeight: 500 }}>{u.gasType}</td>
                <td className="mono">{u.quantityUsed.toFixed(2)}</td>
                <td>{u.usedBy}</td>
                <td style={{ color: 'var(--cds-text-secondary)' }}>{u.customer}</td>
                <td className="mono" style={{ color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-label-01)' }}>
                  {u.jobId}
                </td>
                <td style={{ maxWidth: 200 }}>{u.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedUsage.length === 0 && (
          <div style={{ padding: 'var(--cds-spacing-08)', textAlign: 'center', color: 'var(--cds-text-helper)' }}>
            No usage records match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
