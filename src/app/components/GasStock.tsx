'use client';

import React, { useState } from 'react';
import { GasStockItem, User } from '@/app/types';
import { SectionTitle } from './ui';
import { canManageGasStock } from '@/app/lib/permissions';

interface GasStockProps {
  stock: GasStockItem[];
  currentUser: User;
  onAdd?: (item: GasStockItem) => void;
  onRefresh?: () => void;
}

const LOW_STOCK_THRESHOLD = 20;

function calculateTotalCylinders(stock: GasStockItem[]): number {
  return stock.length;
}

function calculateTotalKg(stock: GasStockItem[]): number {
  return stock.reduce((total, item) => total + item.remaining, 0);
}

function calculateLowStockCount(stock: GasStockItem[]): number {
  return stock.filter(item => getRemainingPercentage(item) < LOW_STOCK_THRESHOLD).length;
}

function getRemainingPercentage(item: GasStockItem): number {
  if (item.quantity === 0) return 0;
  return Math.round((item.remaining / item.quantity) * 100);
}

function isLowStock(item: GasStockItem): boolean {
  return getRemainingPercentage(item) < LOW_STOCK_THRESHOLD;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GasStock({ stock, currentUser, onAdd, onRefresh }: GasStockProps) {
  const [adjustId, setAdjustId] = useState<string | null>(null);
  if (!canManageGasStock(currentUser.role)) return null;
  const [adjustVal, setAdjustVal] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const handleAdjust = async (item: GasStockItem) => {
    if (!adjustVal) return;
    setAdjusting(true);
    try {
      const res = await fetch(`/api/gas-stock/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remaining: parseFloat(adjustVal), reason: adjustReason || 'Manual adjustment' }),
      });
      if (res.ok) {
        setAdjustId(null);
        setAdjustVal('');
        setAdjustReason('');
        onRefresh?.();
      }
    } finally {
      setAdjusting(false);
    }
  };

  const totalCylinders = calculateTotalCylinders(stock);
  const totalKg = calculateTotalKg(stock);
  const lowStockCount = calculateLowStockCount(stock);

  const stats = [
    { label: 'Total Cylinders', v: totalCylinders },
    { label: 'Total kg', v: totalKg.toFixed(1) },
    { label: 'Low Stock Alerts', v: lowStockCount, alert: lowStockCount > 0 },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">Refrigerant Stock</h1>
        <p className="text-sm text-text-secondary">Manage refrigerant gas inventory and track usage</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-layer p-4 border-t-4" style={{ borderTopColor: s.alert ? 'var(--color-support-error)' : 'var(--color-interactive)' }}>
            <div className="text-3xl font-bold" style={{ color: s.alert ? 'var(--color-support-error)' : undefined }}>
              {s.v}
            </div>
            <div className="text-xs text-text-secondary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <SectionTitle>Stock Inventory</SectionTitle>
          {onAdd && (
            <button
              className="inline-flex items-center px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors"
              onClick={() => {
                const emptyItem: GasStockItem = {
                  id: '', gasType: '', brand: '', quantity: 0, remaining: 0, unit: 'kg',
                  supplier: '', supplierRef: '', addedBy: '',
                  date: new Date().toISOString().split('T')[0], notes: '',
                };
                onAdd(emptyItem);
              }}
            >
              + Add Stock
            </button>
          )}
        </div>

        {stock.length === 0 ? (
          <div className="bg-layer p-4">
            <p className="text-sm text-text-secondary text-center p-6">No refrigerant stock records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border-subtle">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface">
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Gas Type</th>
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Brand</th>
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Quantity (kg)</th>
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Remaining</th>
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Supplier</th>
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Added By</th>
                  <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => {
                  const percentage = getRemainingPercentage(item);
                  const lowStock = isLowStock(item);
                  return (
                    <tr key={item.id} style={lowStock ? { backgroundColor: 'rgba(218, 30, 40, 0.05)' } : undefined}>
                      <td className="px-4 py-3 border-b border-border-subtle"><span className="font-semibold text-text-primary">{item.gasType}</span></td>
                      <td className="px-4 py-3 border-b border-border-subtle text-text-secondary">{item.brand}</td>
                      <td className="px-4 py-3 border-b border-border-subtle text-text-primary">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3 border-b border-border-subtle">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold min-w-[45px] ${lowStock ? 'text-support-error' : 'text-text-primary'}`}>
                            {item.remaining} {item.unit}
                          </span>
                          <div className="flex-1 min-w-[60px] h-2 bg-border-subtle rounded overflow-hidden">
                            <div className="h-full transition-all duration-300" style={{ width: `${percentage}%`, backgroundColor: lowStock ? 'var(--color-support-error)' : 'var(--color-support-success)' }} />
                          </div>
                          <span className={`text-xs min-w-[35px] ${lowStock ? 'text-support-error' : 'text-text-secondary'}`}>{percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-border-subtle text-text-secondary">
                        <div>{item.supplier}</div>
                        {item.supplierRef && <div className="text-xs text-text-secondary">Ref: {item.supplierRef}</div>}
                      </td>
                      <td className="px-4 py-3 border-b border-border-subtle text-text-secondary">
                        <div>{item.addedBy}</div>
                        <div className="text-xs text-text-secondary">{formatDate(item.date)}</div>
                      </td>
                      <td className="px-4 py-3 border-b border-border-subtle">
                        {adjustId === item.id ? (
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <input className="w-full h-8 px-2 text-xs bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" step="0.1" placeholder={`New remaining (was ${item.remaining})`} value={adjustVal} onChange={e => setAdjustVal(e.target.value)} />
                            <input className="w-full h-8 px-2 text-xs bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="Reason (optional)" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                            <div className="flex gap-1">
                              <button className="inline-flex items-center px-2 py-1 text-[11px] bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors" disabled={adjusting} onClick={() => handleAdjust(item)}>{adjusting ? 'Saving…' : 'Save'}</button>
                              <button className="inline-flex items-center px-2 py-1 text-[11px] bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => { setAdjustId(null); setAdjustVal(''); setAdjustReason(''); }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button className="inline-flex items-center px-2 py-1 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => { setAdjustId(item.id); setAdjustVal(String(item.remaining)); }}>
                            Adjust Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lowStockCount > 0 && (
          <div className="flex items-start gap-3 p-4 mt-4 bg-amber-50 border-l-4 border-l-support-warning">
            <div>
              <div className="font-semibold text-sm text-text-primary">Low Stock Alert</div>
              <div className="text-sm text-text-secondary">{lowStockCount} item{lowStockCount !== 1 ? 's' : ''} below {LOW_STOCK_THRESHOLD}% remaining. Consider restocking soon.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
