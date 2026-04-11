'use client';

import React, { useState } from 'react';
import { Customer } from '@/app/types';
import { Close } from '@carbon/icons-react';
import { FormItem, Notification } from './ui';

interface AddCustomerModalProps {
  customer: Partial<Customer>;
  onChange: (customer: Partial<Customer>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AddCustomerModal({ customer, onChange, onSave, onClose }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof Customer, value: string) => onChange({ ...customer, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customer.name?.trim() || !customer.email?.trim() || !customer.phone?.trim() || !customer.address?.trim()) {
      setError('Name, email, phone, and address are required.');
      return;
    }

    setLoading(true);
    try {
      await onSave();
    } catch {
      setError('Failed to save customer. Please try again.');
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
            <div className="modal-title">{customer.id ? 'Edit Customer' : 'Add New Customer'}</div>
          </div>
          <button className="x-btn" onClick={onClose} aria-label="Close">
            <Close size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ marginBottom: 'var(--cds-spacing-05)' }}>
                <Notification kind="e" title="Validation Error" body={error} />
              </div>
            )}

            <div className="g2">
              <FormItem label="Full Name *">
                <input className="inp" value={customer.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. John Smith" autoFocus />
              </FormItem>
              <FormItem label="Email *">
                <input className="inp" type="email" value={customer.email || ''} onChange={e => set('email', e.target.value)} placeholder="e.g. john@company.com" />
              </FormItem>
            </div>

            <div className="g2">
              <FormItem label="Phone *">
                <input className="inp" value={customer.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="e.g. +263 77 123 4567" />
              </FormItem>
              <FormItem label="WhatsApp">
                <input className="inp" value={customer.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="Same as phone if identical" />
              </FormItem>
            </div>

            <FormItem label="Billing Address *">
              <input className="inp" value={customer.address || ''} onChange={e => set('address', e.target.value)} placeholder="e.g. 123 Main Street, Harare" />
            </FormItem>

            <FormItem label="Site Address" helper="Leave blank if the same as billing address.">
              <input className="inp" value={customer.siteAddress || ''} onChange={e => set('siteAddress', e.target.value)} placeholder="e.g. 456 Factory Road, Industrial Area" />
            </FormItem>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-g" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-p" disabled={loading}>
              {loading ? 'Saving…' : customer.id ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
