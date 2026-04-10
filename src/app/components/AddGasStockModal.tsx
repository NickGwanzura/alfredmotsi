'use client';

import React, { useState } from 'react';
import { GasStockItem } from '@/app/types';
import { Close } from '@carbon/icons-react';

interface AddGasStockModalProps {
  stock: Partial<GasStockItem>;
  onChange: (stock: Partial<GasStockItem>) => void;
  onSave: () => void;
  onClose: () => void;
}

const GAS_TYPES = ['R-32', 'R-410A', 'R-22', 'R-134a', 'R-407C', 'R-600A', 'R-290'];

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
    } catch (err) {
      setError('Failed to add gas stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-lbl">Gas Stock</div>
            <div className="modal-title">Add New Stock</div>
          </div>
          <button className="x-btn" onClick={onClose} aria-label="Close">
            <Close size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="notif notif-e" style={{ marginBottom: 'var(--s4)' }}>
                <div className="notif-title">Error</div>
                <div className="notif-body">{error}</div>
              </div>
            )}

            <div className="g2" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <label className="form-label">Gas Type *</label>
                <select
                  className="sel"
                  value={stock.gasType || ''}
                  onChange={e => onChange({ ...stock, gasType: e.target.value })}
                  required
                >
                  <option value="">Select gas type</option>
                  {GAS_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Brand *</label>
                <input
                  className="inp"
                  value={stock.brand || ''}
                  onChange={e => onChange({ ...stock, brand: e.target.value })}
                  placeholder="e.g. Honeywell, Chemours"
                  required
                />
              </div>
            </div>

            <div className="g2" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <label className="form-label">Quantity (kg) *</label>
                <input
                  className="inp"
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
                <label className="form-label">Unit</label>
                <select
                  className="sel"
                  value={stock.unit || 'kg'}
                  onChange={e => onChange({ ...stock, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>

            <div className="g2" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <label className="form-label">Supplier *</label>
                <input
                  className="inp"
                  value={stock.supplier || ''}
                  onChange={e => onChange({ ...stock, supplier: e.target.value })}
                  placeholder="e.g. Aircon Spares"
                  required
                />
              </div>
              <div>
                <label className="form-label">Supplier Reference</label>
                <input
                  className="inp"
                  value={stock.supplierRef || ''}
                  onChange={e => onChange({ ...stock, supplierRef: e.target.value })}
                  placeholder="e.g. INV-12345"
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="inp"
                rows={3}
                value={stock.notes || ''}
                onChange={e => onChange({ ...stock, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={loading}>
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
