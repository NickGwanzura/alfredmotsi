'use client';

import React, { useState } from 'react';
import { CRMRecord, Customer, CRMType, CRMOutcome } from '@/app/types';
import { X } from 'lucide-react';
import { FormItem, Notification } from './ui';

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">CRM</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Add Interaction Record</h2>
          </div>
          <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && <Notification kind="e" title="Error" body={error} />}

            <FormItem label="Customer *">
              <select
                className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={record.customerId || ''}
                onChange={e => onChange({ ...record, customerId: e.target.value })}
                required
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Type *">
                <select
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
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
              </FormItem>
              <FormItem label="Outcome *">
                <select
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
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
              </FormItem>
            </div>

            <FormItem label="Subject *">
              <input
                className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={record.subject || ''}
                onChange={e => onChange({ ...record, subject: e.target.value })}
                placeholder="e.g. Follow-up on service call"
                required
              />
            </FormItem>

            <FormItem label="Notes *">
              <textarea
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full resize-vertical"
                rows={4}
                value={record.body || ''}
                onChange={e => onChange({ ...record, body: e.target.value })}
                placeholder="Detailed notes about the interaction..."
                required
              />
            </FormItem>

            <FormItem label="Follow-up Date (optional)">
              <input
                className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full"
                type="date"
                value={record.followUp || ''}
                onChange={e => onChange({ ...record, followUp: e.target.value })}
              />
            </FormItem>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
