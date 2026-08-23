'use client';

import React, { useState } from 'react';
import { GasStockItem, User } from '@/app/types';
import { SectionTitle, ContextBanner } from './ui';
import { canManageGasStock, isAdmin } from '@/app/lib/permissions';
import { gasQuantityToKg, normalizeGasUnit } from '@/app/lib/gasUnits';
import { REFRIGERANT_TYPES } from '@/app/lib/config';
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
  return stock.reduce((total, item) => {
    const unit = normalizeGasUnit(item.unit);
    return total + (unit ? gasQuantityToKg(item.remaining, unit) : 0);
  }, 0);
}
function calculateLowStockCount(stock: GasStockItem[]): number {
  return stock.filter(item => getRemainingPercentage(item) < LOW_STOCK_THRESHOLD).length;
}
function getRemainingPercentage(item: GasStockItem): number {
  if (item.quantity === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((item.remaining / item.quantity) * 100)));
}
function isLowStock(item: GasStockItem): boolean {
  return getRemainingPercentage(item) < LOW_STOCK_THRESHOLD;
}
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GasStock({ stock, currentUser, onAdd, onRefresh }: GasStockProps) {
  const canManage = canManageGasStock(currentUser.role);
  const canCorrect = isAdmin(currentUser.role);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustVal, setAdjustVal] = useState('');
  const [adjustGasType, setAdjustGasType] = useState('');
  const [adjustKind, setAdjustKind] = useState<GasStockItem['stockKind']>('virgin');
  const [adjustSerial, setAdjustSerial] = useState('');
  const [adjustCertification, setAdjustCertification] = useState('');
  const [adjustTare, setAdjustTare] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [lifecycleItem, setLifecycleItem] = useState<GasStockItem | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<'lost' | 'disposed' | 'transfer' | 'retire'>('lost');
  const [lifecycleQuantity, setLifecycleQuantity] = useState('');
  const [lifecycleDestination, setLifecycleDestination] = useState('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleError, setLifecycleError] = useState('');
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

  const handleAdjust = async (item: GasStockItem) => {
    if (!adjustVal || !adjustGasType || !adjustSerial.trim() || !adjustReason.trim()) {
      setAdjustError('Select the refrigerant and cylinder type, enter its serial and corrected balance, and provide a reason.');
      return;
    }
    setAdjustError('');
    setAdjusting(true);
    try {
      const res = await fetch(`/api/gas-stock/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasType: adjustGasType, stockKind: adjustKind, serialNumber: adjustSerial, certificationExpiresAt: adjustCertification || null, tareWeightKg: adjustTare === '' ? null : Number(adjustTare), remaining: parseFloat(adjustVal), reason: adjustReason, expectedVersion: item.version }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAdjustError(data?.error || `Could not update stock (server error ${res.status})`);
        return;
      }
      setAdjustId(null);
      setAdjustVal('');
      setAdjustGasType('');
      setAdjustKind('virgin'); setAdjustSerial(''); setAdjustCertification(''); setAdjustTare('');
      setAdjustReason('');
      onRefresh?.();
    } catch {
      setAdjustError('Network error — the stock correction was not saved.');
    } finally { setAdjusting(false); }
  };

  const handleLifecycle = async () => {
    if (!lifecycleItem || !lifecycleReason.trim() || (lifecycleAction !== 'retire' && (!Number(lifecycleQuantity) || Number(lifecycleQuantity) <= 0))) {
      setLifecycleError('Provide a positive quantity and audit reason.'); return;
    }
    if (lifecycleAction === 'transfer' && !lifecycleDestination) { setLifecycleError('Select a destination cylinder.'); return; }
    setLifecycleSaving(true); setLifecycleError('');
    try {
      const response = await fetch(`/api/gas-stock/${lifecycleItem.id}/lifecycle`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: lifecycleAction, quantity: Number(lifecycleQuantity), destinationStockId: lifecycleDestination || null, reason: lifecycleReason, expectedVersion: lifecycleItem.version, clientRequestId: crypto.randomUUID() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setLifecycleError(data?.error || `Server error ${response.status}`); return; }
      setLifecycleItem(null); setLifecycleQuantity(''); setLifecycleDestination(''); setLifecycleReason('');
      onRefresh?.();
    } catch { setLifecycleError('Network error — lifecycle movement was not saved.'); }
    finally { setLifecycleSaving(false); }
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
      <ContextBanner title="Refrigerant Gas Stock" icon={<Package size={18} />}>
        <p>Track your refrigerant cylinder inventory. When gas is used on a job, stock levels update automatically. Items below <strong>20% remaining</strong> trigger a low-stock alert.</p>
        <p className="mt-1">Click <strong>Add Stock</strong> for new deliveries. Use <strong>Adjust Stock</strong> to correct levels with an audit reason.</p>
      </ContextBanner>
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
          {onAdd && canManage && (
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
              onClick={() => onAdd({ id: '', gasType: '', brand: '', quantity: 0, remaining: 0, unit: 'kg', supplier: '', supplierRef: '', addedBy: '', date: new Date().toISOString().split('T')[0], notes: '', stockKind: 'virgin', version: 0, serialNumber: '', certificationExpiresAt: null, tareWeightKg: null, retiredAt: null })}>
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
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3 border-b border-gray-100">Cylinder</th>
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
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${item.gasType ? 'text-gray-900' : 'text-red-600'}`}>{item.gasType || 'Needs correction'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.brand}</td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-500"><div>{item.stockKind}{item.retiredAt ? ' · retired' : ''}</div><div className="text-xs normal-case text-gray-400">{item.serialNumber || 'Serial needed'}</div>{item.certificationExpiresAt && <div className={`text-xs normal-case ${new Date(item.certificationExpiresAt) < new Date() ? 'font-semibold text-red-600' : 'text-gray-400'}`}>Cert: {new Date(item.certificationExpiresAt).toLocaleDateString('en-ZA')}</div>}</td>
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
                            <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" value={adjustGasType} onChange={e => setAdjustGasType(e.target.value)}>
                              <option value="">Select gas type</option>
                              {REFRIGERANT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white" value={adjustKind} onChange={e => setAdjustKind(e.target.value as GasStockItem['stockKind'])}><option value="virgin">Virgin</option><option value="recovered">Recovered</option><option value="waste">Waste</option></select>
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white" placeholder="Cylinder serial *" value={adjustSerial} onChange={e => setAdjustSerial(e.target.value)} />
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white" type="date" aria-label="Certification expiry" value={adjustCertification} onChange={e => setAdjustCertification(e.target.value)} />
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white" type="number" min="0" step="0.01" placeholder="Tare kg" value={adjustTare} onChange={e => setAdjustTare(e.target.value)} />
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" type="number" step="0.1" min="0" max={item.quantity} placeholder={`New remaining (was ${item.remaining})`} value={adjustVal} onChange={e => setAdjustVal(e.target.value)} />
                            <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Correction reason *" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                            {adjustError && <p className="text-xs font-medium text-red-600" role="alert">{adjustError}</p>}
                            <div className="flex gap-1.5">
                              <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50" disabled={adjusting} onClick={() => handleAdjust(item)}>{adjusting ? 'Saving...' : 'Save'}</button>
                              <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors border-none cursor-pointer" onClick={() => { setAdjustId(null); setAdjustVal(''); setAdjustGasType(''); setAdjustKind('virgin'); setAdjustSerial(''); setAdjustCertification(''); setAdjustTare(''); setAdjustReason(''); setAdjustError(''); }}>Cancel</button>
                            </div>
                          </div>
                        ) : canCorrect ? (
                          <div className="flex flex-wrap gap-1.5"><button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => { setAdjustId(item.id); setAdjustVal(String(item.remaining)); setAdjustGasType(item.gasType); setAdjustKind(item.stockKind); setAdjustSerial(item.serialNumber || ''); setAdjustCertification(item.certificationExpiresAt?.slice(0, 10) || ''); setAdjustTare(item.tareWeightKg == null ? '' : String(item.tareWeightKg)); setAdjustReason(''); setAdjustError(''); }}>Correct</button><button disabled={!!item.retiredAt} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-40" onClick={() => { setLifecycleItem(item); setLifecycleAction('lost'); setLifecycleQuantity(''); setLifecycleDestination(''); setLifecycleReason(''); setLifecycleError(''); }}>Lifecycle</button></div>
                        ) : null}
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
      {lifecycleItem && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Cylinder {lifecycleItem.serialNumber || lifecycleItem.id}</p><h2 className="mt-1 text-xl font-bold">Lifecycle movement</h2></div>
            <div className="space-y-4 px-6 py-5">
              {lifecycleError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{lifecycleError}</p>}
              <select className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" value={lifecycleAction} onChange={event => setLifecycleAction(event.target.value as typeof lifecycleAction)}><option value="lost">Loss / leak</option><option value="disposed">Disposed / destroyed</option><option value="transfer">Transfer to another cylinder</option><option value="retire">Retire empty cylinder</option></select>
              {lifecycleAction !== 'retire' && <input className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" type="number" min="0.01" step="0.01" max={lifecycleItem.remaining} value={lifecycleQuantity} onChange={event => setLifecycleQuantity(event.target.value)} placeholder={`Quantity (${lifecycleItem.unit})`} />}
              {lifecycleAction === 'transfer' && <select className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" value={lifecycleDestination} onChange={event => setLifecycleDestination(event.target.value)}><option value="">Destination cylinder</option>{stock.filter(item => item.id !== lifecycleItem.id && !item.retiredAt && item.gasType === lifecycleItem.gasType && item.unit === lifecycleItem.unit && item.remaining < item.quantity).map(item => <option key={item.id} value={item.id}>{item.serialNumber || item.id} · {item.stockKind} · {item.remaining}/{item.quantity} {item.unit}</option>)}</select>}
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={3} maxLength={500} value={lifecycleReason} onChange={event => setLifecycleReason(event.target.value)} placeholder="Audit reason *" />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4"><button type="button" disabled={lifecycleSaving} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm" onClick={() => setLifecycleItem(null)}>Cancel</button><button type="button" disabled={lifecycleSaving || !lifecycleReason.trim()} className="rounded-lg border-none bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={handleLifecycle}>{lifecycleSaving ? 'Saving…' : 'Record movement'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
