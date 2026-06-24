'use client';

import React, { useState, useEffect } from 'react';
import { GasUsageRecord, GasStockItem, Customer, Job } from '@/app/types';
import { X } from 'lucide-react';

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
  const [selectedStock, setSelectedStock] = useState<GasStockItem | null>(null);

  useEffect(() => {
    if (usage.stockId) {
      const found = stock.find(s => s.id === usage.stockId);
      setSelectedStock(found || null);
      if (found && !usage.gasType) {
        onChange({ ...usage, gasType: found.gasType });
      }
    }
  }, [usage.stockId, stock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!usage.stockId || !usage.quantityUsed || !usage.customer || !usage.jobId) {
      setError('Gas stock, quantity used, customer, and job are required');
      setLoading(false);
      return;
    }

    if (selectedStock && usage.quantityUsed > selectedStock.remaining) {
      setError(`Insufficient stock. Only ${selectedStock.remaining} ${selectedStock.unit} remaining`);
      setLoading(false);
      return;
    }

    try {
      await onSave();
    } catch (err) {
      setError('Failed to record gas usage');
    } finally {
      setLoading(false);
    }
  };

  const availableStock = stock.filter(s => s.remaining > 0);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gas Usage</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Record Gas Usage</h2>
          </div>
          <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={onClose} aria-label="Close">
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
                <p>Please add gas stock first before recording usage.</p>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Gas Stock *</label>
              <select
                className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={usage.stockId || ''}
                onChange={e => onChange({ ...usage, stockId: e.target.value })}
                required
                disabled={availableStock.length === 0}
              >
                <option value="">Select gas stock</option>
                {availableStock.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.gasType} - {s.brand} ({s.remaining} {s.unit} remaining)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Quantity Used ({selectedStock?.unit || 'kg'}) *</label>
                <input
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={selectedStock?.remaining}
                  value={usage.quantityUsed || ''}
                  onChange={e => onChange({ ...usage, quantityUsed: parseFloat(e.target.value) })}
                  placeholder="e.g. 2.5"
                  required
                  disabled={!usage.stockId}
                />
                {selectedStock && (
                  <p className="text-xs text-gray-400 mt-1">Max: {selectedStock.remaining} {selectedStock.unit}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Customer *</label>
                <select
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  value={usage.customer || ''}
                  onChange={e => onChange({ ...usage, customer: e.target.value })}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Job *</label>
              <select
                className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={usage.jobId || ''}
                onChange={e => onChange({ ...usage, jobId: e.target.value })}
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
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Purpose (optional)</label>
              <input
                className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={usage.purpose || ''}
                onChange={e => onChange({ ...usage, purpose: e.target.value })}
                placeholder="e.g. Leak repair, System recharge"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-50" 
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
