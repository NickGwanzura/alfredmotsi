'use client';

import React, { useMemo, useState } from 'react';
import { GasUsageRecord, GasStockItem, Customer, Job } from '@/app/types';
import { X } from 'lucide-react';
import { isCertificationExpired } from '@/app/lib/gasStockRules';
import { formatHarareDateTime } from '@/app/lib/gasUnits';

interface AddGasUsageModalProps {
  usage: Partial<GasUsageRecord>;
  stock: GasStockItem[];
  customers: Customer[];
  jobs: Job[];
  onChange: (usage: Partial<GasUsageRecord>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AddGasUsageModal({ usage, stock, customers, jobs, onChange, onSave, onClose }: AddGasUsageModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedStock = useMemo(
    () => stock.find((item) => item.id === usage.stockId) ?? null,
    [stock, usage.stockId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!usage.stockId || !usage.jobId || !usage.movementType) {
      setError('Gas stock and job are required');
      setLoading(false);
      return;
    }

    if (!usage.quantityUsed || usage.quantityUsed <= 0) {
      setError('Quantity must be a positive number');
      setLoading(false);
      return;
    }

    if (!usage.purpose?.trim()) {
      setError('A purpose or service reason is required');
      setLoading(false);
      return;
    }

    const available = selectedStock && usage.movementType === 'recovered'
      ? selectedStock.quantity - selectedStock.remaining
      : selectedStock?.remaining;
    if (available !== undefined && usage.quantityUsed > available) {
      setError(`Only ${available} ${selectedStock?.unit} is available for this movement`);
      setLoading(false);
      return;
    }

    try {
      await onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record gas usage');
    } finally {
      setLoading(false);
    }
  };

  const movementType = usage.movementType || 'used';
  const today = formatHarareDateTime().date;
  const availableStock = stock.filter(s => {
    if (!s.gasType || !s.serialNumber) return false;
    if (s.retiredAt || isCertificationExpired(s.certificationExpiresAt, today)) return false;
    if (movementType === 'used') return s.stockKind === 'virgin' && s.remaining > 0;
    if (movementType === 'reused') return s.stockKind === 'recovered' && s.remaining > 0;
    return s.stockKind === 'recovered' && s.remaining < s.quantity;
  });
  const maxQuantity = selectedStock
    ? (movementType === 'recovered' ? selectedStock.quantity - selectedStock.remaining : selectedStock.remaining)
    : undefined;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 lg:p-8" onClick={onClose} role="presentation">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="record-gas-title">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gas Usage</p>
            <h2 id="record-gas-title" className="text-xl font-bold text-gray-900 mt-1">Record Gas Usage</h2>
          </div>
          <button className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold">Error</p>
                <p>{error}</p>
              </div>
            )}

            {availableStock.length === 0 && (
              <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-semibold">No Stock Available</p>
                <p>Please add a compatible {movementType === 'used' ? 'virgin' : 'recovered-gas'} cylinder first.</p>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Movement Type *</label>
              <select
                className="h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={movementType}
                onChange={e => onChange({ ...usage, movementType: e.target.value as GasUsageRecord['movementType'], stockId: '' })}
              >
                <option value="used">Used — new refrigerant</option>
                <option value="recovered">Recovered — collected into cylinder</option>
                <option value="reused">Reused — recovered refrigerant recharged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Gas Stock *</label>
              <select
                className="h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={usage.stockId || ''}
                onChange={e => onChange({ ...usage, stockId: e.target.value })}
                required
                disabled={availableStock.length === 0}
              >
                <option value="">Select gas stock</option>
                {availableStock.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.gasType} - {s.brand} ({s.remaining}/{s.quantity} {s.unit}, {s.stockKind})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Quantity ({selectedStock?.unit || 'kg'}) *</label>
                <input
                  className="h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={maxQuantity}
                  value={usage.quantityUsed || ''}
                  onChange={e => onChange({ ...usage, quantityUsed: parseFloat(e.target.value) })}
                  placeholder="e.g. 2.5"
                  required
                  disabled={!usage.stockId}
                />
                {selectedStock && (
                  <p className="text-xs text-gray-400 mt-1">Max: {maxQuantity} {selectedStock.unit}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Customer</label>
                <div className="min-h-9 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {usage.customer || 'Select a job below'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Job *</label>
              <select
                className="h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={usage.jobId || ''}
                onChange={e => {
                  const selectedJob = jobs.find(job => job.id === e.target.value);
                  const customer = customers.find(item => item.id === selectedJob?.customerId);
                  onChange({ ...usage, jobId: e.target.value, customer: customer?.name || '' });
                }}
                required
              >
                <option value="">Select job</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.jobCardRef} - {j.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Purpose / service reason *</label>
              <input
                className="h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={usage.purpose || ''}
                onChange={e => onChange({ ...usage, purpose: e.target.value })}
                placeholder="e.g. Leak repair, System recharge"
                required
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-50"
              disabled={loading || availableStock.length === 0}
            >
              {loading ? 'Recording...' : 'Record Usage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
