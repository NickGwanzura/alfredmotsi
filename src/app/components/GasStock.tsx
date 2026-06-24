'use client';

import React, { useState } from 'react';
import { GasStockItem, User } from '@/app/types';
import { SectionTitle } from './ui';
import { canManageGasStock } from '@/app/lib/permissions';
import { Package, Weight, AlertTriangle, RefreshCcw, Plus } from 'lucide-react';

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
  return new Date(dateStr).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GasStock({ stock, currentUser, onAdd, onRefresh }: GasStockProps) {
  const [adjustId, setAdjustId] = useState<string | null>(null);
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
      if (res.ok) { setAdjustId(null); setAdjustVal(''); setAdjustReason(''); onRefresh?.(); }
    } finally { setAdjusting(false); }
  };

  const totalCylinders = calculateTotalCylinders(stock);
  const totalKg = calculateTotalKg(stock);
  const lowStockCount = calculateLowStockCount(stock);
  const stats = [
    { label: 'Total Cylinders', v: totalCylinders, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Total kg', v: totalKg.toFixed(1), icon: Weight, color: 'from-violet-500 to-violet-600' },
    { label: 'Low Stock Alerts', v: lowStockCount, icon: AlertTriangle, color: 'from-amber-500 to-amber-600', alert: lowStockCount > 0 },
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Refrigerant Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage refrigerant gas inventory and track usage</p>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button onClick={onRefresh} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors border-none cursor-pointer">
              <RefreshCcw size={16} /> Refresh
            </button>
          )}
          {onAdd && (
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
              onClick={() => onAdd({ id: '', gasType: '', brand: '', quantity: 0, remaining: 0, unit: 'kg', supplier: '', supplierRef: '', addedBy: '', date: new Date().toISOString().split('T')[0], notes: '' })}>
              <Plus size={16} /> Add Stock
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}><s.icon size={18} /></div>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${s.alert ? 'text-amber-600' : 'text-gray-900'}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <SectionTitle>Stock Inventory</SectionTitle>
        {stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No refrigerant stock records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Gas Type</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Brand</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Quantity</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Remaining</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Supplier</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Added By</th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(item => {
                  const percentage = getRemainingPercentage(item);
                  const lowStock = isLowStock(item);
                  return (
                    <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${lowStock ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3"><span className="font-semibold text-sm text-gray-900">{item.gasType}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.brand}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold text-sm font-mono min-w-[50px] ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>{item.remaining} {item.unit}</span>
                          <div className="flex-1 min-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${lowStock ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${percentage}%` }} />
                          </div>
                          <span className={`text-xs font-mono min-w-[35px] ${lowStock ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div>{item.supplier}</div>
                        {item.supplierRef && <div className="text-xs text-gray-400">Ref: {item.supplierRef}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div>{item.addedBy}</div>
                        <div className="text-xs text-gray-400">{formatDate(item.date)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {adjustId === item.id ? (
                          <div className="flex flex-col gap-1.5 min-w-[220px] py-1">
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" type="number" step="0.1" placeholder={`New remaining (was ${item.remaining})`} value={adjustVal} onChange={e => setAdjustVal(e.target.value)} />
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Reason (optional)" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                            <div className="flex gap-1.5">
                              <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50" disabled={adjusting} onClick={() => handleAdjust(item)}>{adjusting ? 'Saving...' : 'Save'}</button>
                              <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors border-none cursor-pointer" onClick={() => { setAdjustId(null); setAdjustVal(''); setAdjustReason(''); }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors border-none cursor-pointer" onClick={() => { setAdjustId(item.id); setAdjustVal(String(item.remaining)); }}>Adjust Stock</button>
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
          <div className="flex items-start gap-3 p-4 mt-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="p-1.5 rounded-full bg-amber-100 text-amber-600 shrink-0 mt-0.5"><AlertTriangle size={14} /></div>
            <div>
              <div className="font-semibold text-sm text-amber-800">Low Stock Alert</div>
              <div className="text-sm text-amber-700">{lowStockCount} item{lowStockCount !== 1 ? 's' : ''} below {LOW_STOCK_THRESHOLD}% remaining.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
