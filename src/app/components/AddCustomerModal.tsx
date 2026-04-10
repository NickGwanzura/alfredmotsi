'use client';

import React, { useState } from 'react';
import { Customer } from '@/app/types';
import { Close } from '@carbon/icons-react';

interface AddCustomerModalProps {
  customer: Partial<Customer>;
  onChange: (customer: Partial<Customer>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AddCustomerModal({ customer, onChange, onSave, onClose }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!customer.name || !customer.email || !customer.phone || !customer.address) {
      setError('Name, email, phone, and address are required');
      setLoading(false);
      return;
    }

    try {
      await onSave();
    } catch (err) {
      setError('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-lbl">Customer Database</div>
            <div className="modal-title">Add New Customer</div>
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
                <label className="form-label">Full Name *</label>
                <input
                  className="inp"
                  value={customer.name || ''}
                  onChange={e => onChange({ ...customer, name: e.target.value })}
                  placeholder="e.g. John Smith"
                  required
                />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input
                  className="inp"
                  type="email"
                  value={customer.email || ''}
                  onChange={e => onChange({ ...customer, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  required
                />
              </div>
            </div>

            <div className="g2" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <label className="form-label">Phone *</label>
                <input
                  className="inp"
                  value={customer.phone || ''}
                  onChange={e => onChange({ ...customer, phone: e.target.value })}
                  placeholder="e.g. +263 77 123 4567"
                  required
                />
              </div>
              <div>
                <label className="form-label">WhatsApp (optional)</label>
                <input
                  className="inp"
                  value={customer.whatsapp || ''}
                  onChange={e => onChange({ ...customer, whatsapp: e.target.value })}
                  placeholder="e.g. +263 77 123 4567"
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Address *</label>
              <input
                className="inp"
                value={customer.address || ''}
                onChange={e => onChange({ ...customer, address: e.target.value })}
                placeholder="e.g. 123 Main Street, Harare"
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--s4)' }}>
              <label className="form-label">Site Address (optional)</label>
              <input
                className="inp"
                value={customer.siteAddress || ''}
                onChange={e => onChange({ ...customer, siteAddress: e.target.value })}
                placeholder="e.g. 456 Factory Road, Industrial Area"
              />
              <small style={{ color: 'var(--ts)', fontSize: '12px' }}>
                If different from billing address
              </small>
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={loading}>
              {loading ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
