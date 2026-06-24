'use client';

import React, { useState } from 'react';
import { Customer } from '@/app/types';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Customer Database</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{customer.id ? 'Edit Customer' : 'Add New Customer'}</h2>
          </div>
          <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && <Notification kind="e" title="Validation Error" body={error} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Full Name *">
                <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={customer.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. John Smith" autoFocus />
              </FormItem>
              <FormItem label="Email *">
                <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" type="email" value={customer.email || ''} onChange={e => set('email', e.target.value)} placeholder="e.g. john@company.com" />
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Phone *">
                <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={customer.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="e.g. +263 77 123 4567" />
              </FormItem>
              <FormItem label="WhatsApp">
                <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={customer.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="Same as phone if identical" />
              </FormItem>
            </div>

            <FormItem label="Billing Address *">
              <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={customer.address || ''} onChange={e => set('address', e.target.value)} placeholder="e.g. 123 Main Street, Harare" />
            </FormItem>

            <FormItem label="Site Address" helper="Leave blank if the same as billing address.">
              <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={customer.siteAddress || ''} onChange={e => set('siteAddress', e.target.value)} placeholder="e.g. 456 Factory Road, Industrial Area" />
            </FormItem>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving…' : customer.id ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
