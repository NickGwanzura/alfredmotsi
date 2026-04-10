'use client';

import React, { useState, useEffect } from 'react';
import { GasUsageRecord, GasStockItem, Customer, Job } from '@/app/types';
import { Close } from '@carbon/icons-react';

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
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-lbl">Gas Usage</div>
            <div className="modal-title">Record Gas Usage</div>
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

            {availableStock.length === 0 && (
              <div className="notif notif-w" style={{ marginBottom: 'var(--s4)' }}>
                <div className="notif-title">No Stock Available</div>
                <div className="notif-body">Please add gas stock first before recording usage.</div>
              </div>
            )}

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Gas Stock *</label>
              <select
                className="sel"
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

            <div className="g2" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <label className="form-label">Quantity Used ({selectedStock?.unit || 'kg'}) *</label>
                <input
                  className="inp"
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
                  <small style={{ color: 'var(--ts)', fontSize: '12px' }}>
                    Max: {selectedStock.remaining} {selectedStock.unit}
                  </small>
                )}
              </div>
              <div>
                <label className="form-label">Customer *</label>
                <select
                  className="sel"
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

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Job *</label>
              <select
                className="sel"
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

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Purpose (optional)</label>
              <input
                className="inp"
                value={usage.purpose || ''}
                onChange={e => onChange({ ...usage, purpose: e.target.value })}
                placeholder="e.g. Leak repair, System recharge"
              />
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-p" 
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
