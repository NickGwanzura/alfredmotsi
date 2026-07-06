'use client';

import React, { useState } from 'react';
import { GasStockItem } from '@/app/types';
import { X } from 'lucide-react';
import { REFRIGERANT_TYPES } from '@/app/lib/config';

interface AddGasStockModalProps {
  stock: Partial<GasStockItem>;
  onChange: (stock: Partial<GasStockItem>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AddGasStockModal({ stock, onChange, onSave, onClose }: AddGasStockModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!stock.gasType || !stock.brand || !stock.quantity || !stock.supplier) {
      setError('Gas type, brand, quantity, and supplier are required');
      setLoading(false);
      return;
    }

    try {
      await onSave();
    } catch (err: any) {
      setError(err?.message || 'Failed to add gas stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gas Stock</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Add New Stock</h2>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Gas Type *</label>
                <select
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  value={stock.gasType || ''}
                  onChange={e => onChange({ ...stock, gasType: e.target.value })}
                  required
                >
                  <option value="">Select gas type</option>
                  {REFRIGERANT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Brand *</label>
                <input
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  value={stock.brand || ''}
                  onChange={e => onChange({ ...stock, brand: e.target.value })}
                  placeholder="e.g. Honeywell, Chemours"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Quantity (kg) *</label>
                <input
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  type="number"
                  step="0.1"
                  min="0"
                  value={stock.quantity || ''}
                  onChange={e => onChange({ ...stock, quantity: parseFloat(e.target.value) })}
                  placeholder="e.g. 12.5"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Unit</label>
                <select
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  value={stock.unit || 'kg'}
                  onChange={e => onChange({ ...stock, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Supplier *</label>
                <input
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  value={stock.supplier || ''}
                  onChange={e => onChange({ ...stock, supplier: e.target.value })}
                  placeholder="e.g. Aircon Spares"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Supplier Reference</label>
                <input
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                  value={stock.supplierRef || ''}
                  onChange={e => onChange({ ...stock, supplierRef: e.target.value })}
                  placeholder="e.g. INV-12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <textarea
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full resize-vertical"
                rows={3}
                value={stock.notes || ''}
                onChange={e => onChange({ ...stock, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-50" disabled={loading}>
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
