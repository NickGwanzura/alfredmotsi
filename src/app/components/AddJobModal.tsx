'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { User, Customer, Job, JobType, UnitType, IssueType, JobPriority, RecurringSchedule } from '@/app/types';
import { TYPE_CFG, UNIT_TYPES } from '@/app/lib/config';
import { hasConflict, newId } from '@/app/lib/utils';
import { FormItem, Notification } from './ui';
import { X } from 'lucide-react';

interface AddJobModalProps {
  techs: User[];
  customers: Customer[];
  jobs: Job[];
  onSave: (job: Job) => void | Promise<void>;
  onClose: () => void;
}

const ISSUE_TYPES: IssueType[] = ['install', 'repair', 'service', 'quote'];
const PRIORITIES: JobPriority[] = ['emergency', 'urgent', 'high', 'normal', 'medium', 'low'];
const RECURRING_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 3, label: 'Every 3 months' },
  { value: 6, label: 'Every 6 months' },
  { value: 12, label: 'Every 12 months' },
];

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export default function AddJobModal({ techs, customers, jobs, onSave, onClose }: AddJobModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'installation' as JobType,
    customerId: '',
    unitType: 'Split System' as UnitType,
    issue: 'service' as IssueType,
    priority: 'normal' as JobPriority,
    date: '',
    time: '',
    durationMinutes: 120,
    leadTechId: '',
    coTechId: '',
    description: '',
    recurring: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Job title is required';
    if (!formData.customerId) newErrors.customerId = 'Please select a customer';
    if (!formData.date) newErrors.date = 'Please select a date';
    if (!formData.time) newErrors.time = 'Please select a time';
    if (!formData.leadTechId) newErrors.leadTechId = 'Please select a lead technician';
    if (formData.date && !isValidCalendarDate(formData.date)) newErrors.date = 'Please select a valid date';
    if (formData.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(formData.time)) newErrors.time = 'Please select a valid time';
    if (!Number.isInteger(formData.durationMinutes) || formData.durationMinutes < 30 || formData.durationMinutes > 1440) newErrors.durationMinutes = 'Duration must be between 30 and 1,440 minutes';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkConflicts = (): boolean => {
    setConflictError(null);
    if (!formData.date || !formData.time || !formData.leadTechId) return false;
    if (hasConflict(jobs, formData.leadTechId, formData.date, formData.time, null, formData.durationMinutes)) {
      setConflictError('Lead technician has a scheduling conflict at this time');
      return true;
    }
    if (formData.coTechId && hasConflict(jobs, formData.coTechId, formData.date, formData.time, null, formData.durationMinutes)) {
      setConflictError('Co-technician has a scheduling conflict at this time');
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || checkConflicts()) return;
    setSaveError(null);
    setSaving(true);
    const techIds = [formData.leadTechId];
    const coTechIds: string[] = [];
    if (formData.coTechId && formData.coTechId !== formData.leadTechId) coTechIds.push(formData.coTechId);
    const recurring: RecurringSchedule | null = formData.recurring ? { interval: formData.recurring, unit: 'months' } : null;
    const newJob: Job = {
      id: newId(), source: 'admin', customerId: formData.customerId, title: formData.title,
      type: formData.type, unitType: formData.unitType, issue: formData.issue, priority: formData.priority,
      date: formData.date, time: formData.time, techIds, coTechIds, status: 'scheduled',
      durationMinutes: formData.durationMinutes,
      clockIn: null, clockOut: null, description: formData.description, diagnostics: null,
      photos: [], signature: null, jobCardRef: `JC-${Date.now().toString().slice(-6)}`,
      alerts: [], recurring, comments: [], history: [],
    };
    try {
      await onSave(newJob);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not create the job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const availableCoTechs = useMemo(() => techs.filter(t => t.id !== formData.leadTechId), [techs, formData.leadTechId]);

  const handleChange = (field: keyof typeof formData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    setConflictError(null);
  };

  const inputClass = "h-11 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full";
  const textareaClass = "px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full resize-vertical";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 lg:p-8" onClick={onClose} role="presentation">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[780px] mx-auto overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-job-title">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Job Management</p>
            <h2 id="add-job-title" className="text-xl font-bold text-gray-900 mt-1">Add New Job</h2>
          </div>
          <button className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {conflictError && (
              <div className="animate-fade-in">
                <Notification kind="w" title="Scheduling Conflict" body={conflictError} />
              </div>
            )}
            {saveError && <Notification kind="e" title="Could not create job" body={saveError} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormItem label="Job Title" error={errors.title}>
                <input type="text" className={inputClass} value={formData.title} onChange={e => handleChange('title', e.target.value)} placeholder="Enter job title" />
              </FormItem>
              <FormItem label="Job Type">
                <select className={inputClass} value={formData.type} onChange={e => handleChange('type', e.target.value as JobType)}>
                  {Object.entries(TYPE_CFG).map(([key, cfg]) => <option key={key} value={key}>{cfg.icon} {cfg.label}</option>)}
                </select>
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Customer" error={errors.customerId}>
                <select className={inputClass} value={formData.customerId} onChange={e => handleChange('customerId', e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.address}</option>)}
                </select>
              </FormItem>
              <FormItem label="Unit Type">
                <select className={inputClass} value={formData.unitType} onChange={e => handleChange('unitType', e.target.value as UnitType)}>
                  {UNIT_TYPES.map(ut => <option key={ut} value={ut}>{ut}</option>)}
                </select>
              </FormItem>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormItem label="Issue Type">
                <select className={inputClass} value={formData.issue} onChange={e => handleChange('issue', e.target.value as IssueType)}>
                  {ISSUE_TYPES.map(it => <option key={it} value={it}>{it.charAt(0).toUpperCase() + it.slice(1)}</option>)}
                </select>
              </FormItem>
              <FormItem label="Priority">
                <select className={inputClass} value={formData.priority} onChange={e => handleChange('priority', e.target.value as JobPriority)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </FormItem>
              <FormItem label="Recurring Schedule">
                <select className={inputClass} value={formData.recurring ?? ''} onChange={e => handleChange('recurring', e.target.value ? parseInt(e.target.value) : null)}>
                  {RECURRING_OPTIONS.map(opt => <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>)}
                </select>
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Date" error={errors.date}>
                <input type="date" className={inputClass} value={formData.date} onChange={e => handleChange('date', e.target.value)} />
              </FormItem>
              <FormItem label="Time" error={errors.time}>
                <input type="time" className={inputClass} value={formData.time} onChange={e => handleChange('time', e.target.value)} />
              </FormItem>
              <FormItem label="Duration (minutes)" error={errors.durationMinutes}>
                <input type="number" min="30" max="1440" step="30" inputMode="numeric" className={inputClass} value={formData.durationMinutes} onChange={e => handleChange('durationMinutes', parseInt(e.target.value) || 0)} />
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Lead Technician" error={errors.leadTechId}>
                <select className={inputClass} value={formData.leadTechId} onChange={e => handleChange('leadTechId', e.target.value)}>
                  <option value="">Select technician...</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.name} {t.specialty ? `— ${t.specialty}` : ''}</option>)}
                </select>
              </FormItem>
              <FormItem label="Co-Technician (Optional)">
                <select className={inputClass} value={formData.coTechId} onChange={e => handleChange('coTechId', e.target.value)}>
                  <option value="">None</option>
                  {availableCoTechs.map(t => <option key={t.id} value={t.id}>{t.name} {t.specialty ? `— ${t.specialty}` : ''}</option>)}
                </select>
              </FormItem>
            </div>

            <FormItem label="Scope of Work">
              <textarea className={textareaClass} rows={4} value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="Describe the scope of work..." />
            </FormItem>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving} className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{saving ? 'Saving…' : 'Save Job'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
