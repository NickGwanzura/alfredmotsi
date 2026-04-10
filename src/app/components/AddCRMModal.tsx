'use client';

import React, { useState } from 'react';
import { CRMRecord, Customer, CRMType, CRMOutcome } from '@/app/types';
import { Close } from '@carbon/icons-react';

interface AddCRMModalProps {
  record: Partial<CRMRecord>;
  customers: Customer[];
  onChange: (record: Partial<CRMRecord>) => void;
  onSave: () => void;
  onClose: () => void;
}

const CRM_TYPES: { value: CRMType; label: string; icon: string }[] = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'visit', label: 'Visit', icon: '🏢' },
  { value: 'complaint', label: 'Complaint', icon: '⚠️' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'quote', label: 'Quote', icon: '💰' },
];

const CRM_OUTCOMES: { value: CRMOutcome; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
];

export default function AddCRMModal({ record, customers, onChange, onSave, onClose }: AddCRMModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!record.customerId || !record.type || !record.subject || !record.body) {
      setError('Customer, type, subject, and notes are required');
      setLoading(false);
      return;
    }

    try {
      await onSave();
    } catch (err) {
      setError('Failed to create CRM record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-lbl">CRM</div>
            <div className="modal-title">Add Interaction Record</div>
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

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Customer *</label>
              <select
                className="sel"
                value={record.customerId || ''}
                onChange={e => onChange({ ...record, customerId: e.target.value })}
                required
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="g2" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <label className="form-label">Type *</label>
                <select
                  className="sel"
                  value={record.type || ''}
                  onChange={e => onChange({ ...record, type: e.target.value as CRMType })}
                  required
                >
                  <option value="">Select type</option>
                  {CRM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Outcome *</label>
                <select
                  className="sel"
                  value={record.outcome || 'pending'}
                  onChange={e => onChange({ ...record, outcome: e.target.value as CRMOutcome })}
                  required
                >
                  {CRM_OUTCOMES.map(outcome => (
                    <option key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Subject *</label>
              <input
                className="inp"
                value={record.subject || ''}
                onChange={e => onChange({ ...record, subject: e.target.value })}
                placeholder="e.g. Follow-up on service call"
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Notes *</label>
              <textarea
                className="inp"
                rows={4}
                value={record.body || ''}
                onChange={e => onChange({ ...record, body: e.target.value })}
                placeholder="Detailed notes about the interaction..."
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Follow-up Date (optional)</label>
              <input
                className="inp"
                type="date"
                value={record.followUp || ''}
                onChange={e => onChange({ ...record, followUp: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={loading}>
              {loading ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
