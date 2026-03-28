'use client';

import React, { useState, useMemo } from 'react';
import { User, Customer, Job, JobType, UnitType, IssueType, JobPriority, RecurringSchedule } from '@/app/types';
import { TYPE_CFG, UNIT_TYPES } from '@/app/lib/config';
import { hasConflict, newId } from '@/app/lib/utils';
import { FormItem, Notification } from './ui';

interface AddJobModalProps {
  techs: User[];
  customers: Customer[];
  jobs: Job[];
  onSave: (job: Job) => void;
  onClose: () => void;
}

const ISSUE_TYPES: IssueType[] = ['install', 'repair', 'service', 'quote'];
const PRIORITIES: JobPriority[] = ['urgent', 'high', 'medium', 'low'];
const RECURRING_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 3, label: 'Every 3 months' },
  { value: 6, label: 'Every 6 months' },
  { value: 12, label: 'Every 12 months' },
];

export default function AddJobModal({ techs, customers, jobs, onSave, onClose }: AddJobModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'installation' as JobType,
    customerId: '',
    unitType: 'Split System' as UnitType,
    issue: 'service' as IssueType,
    priority: 'medium' as JobPriority,
    date: '',
    time: '',
    leadTechId: '',
    coTechId: '',
    description: '',
    recurring: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!formData.customerId) {
      newErrors.customerId = 'Please select a customer';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    if (!formData.time) {
      newErrors.time = 'Please select a time';
    }

    if (!formData.leadTechId) {
      newErrors.leadTechId = 'Please select a lead technician';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkConflicts = (): boolean => {
    setConflictError(null);

    if (!formData.date || !formData.time || !formData.leadTechId) {
      return false;
    }

    const leadConflict = hasConflict(jobs, formData.leadTechId, formData.date, formData.time, null);
    if (leadConflict) {
      setConflictError('Lead technician has a scheduling conflict at this time');
      return true;
    }

    if (formData.coTechId) {
      const coConflict = hasConflict(jobs, formData.coTechId, formData.date, formData.time, null);
      if (coConflict) {
        setConflictError('Co-technician has a scheduling conflict at this time');
        return true;
      }
    }

    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (checkConflicts()) {
      return;
    }

    const techIds = [formData.leadTechId];
    const coTechIds: string[] = [];
    if (formData.coTechId && formData.coTechId !== formData.leadTechId) {
      coTechIds.push(formData.coTechId);
    }

    const recurring: RecurringSchedule | null = formData.recurring
      ? { interval: formData.recurring, unit: 'months' }
      : null;

    const newJob: Job = {
      id: newId(),
      source: 'admin',
      customerId: formData.customerId,
      title: formData.title,
      type: formData.type,
      unitType: formData.unitType,
      issue: formData.issue,
      priority: formData.priority,
      date: formData.date,
      time: formData.time,
      techIds,
      coTechIds,
      status: 'scheduled',
      clockIn: null,
      clockOut: null,
      description: formData.description,
      diagnostics: null,
      photos: [],
      signature: null,
      jobCardRef: `JC-${Date.now().toString().slice(-6)}`,
      alerts: [],
      recurring,
      comments: [],
      history: [],
    };

    onSave(newJob);
  };

  const availableCoTechs = useMemo(() => {
    return techs.filter(t => t.id !== formData.leadTechId);
  }, [techs, formData.leadTechId]);

  const handleChange = (field: keyof typeof formData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setConflictError(null);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3 className="modal-title">Add New Job</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {conflictError && (
              <div className="fi-anim">
                <Notification kind="w" title="Scheduling Conflict" body={conflictError} />
              </div>
            )}

            <div className="g2">
              <FormItem label="Job Title" error={errors.title}>
                <input
                  type="text"
                  className="inp"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Enter job title"
                />
              </FormItem>

              <FormItem label="Job Type">
                <select
                  className="sel"
                  value={formData.type}
                  onChange={e => handleChange('type', e.target.value as JobType)}
                >
                  {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
              </FormItem>
            </div>

            <div className="g2">
              <FormItem label="Customer" error={errors.customerId}>
                <select
                  className="sel"
                  value={formData.customerId}
                  onChange={e => handleChange('customerId', e.target.value)}
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.address}
                    </option>
                  ))}
                </select>
              </FormItem>

              <FormItem label="Unit Type">
                <select
                  className="sel"
                  value={formData.unitType}
                  onChange={e => handleChange('unitType', e.target.value as UnitType)}
                >
                  {UNIT_TYPES.map(ut => (
                    <option key={ut} value={ut}>
                      {ut}
                    </option>
                  ))}
                </select>
              </FormItem>
            </div>

            <div className="g3">
              <FormItem label="Issue Type">
                <select
                  className="sel"
                  value={formData.issue}
                  onChange={e => handleChange('issue', e.target.value as IssueType)}
                >
                  {ISSUE_TYPES.map(it => (
                    <option key={it} value={it}>
                      {it.charAt(0).toUpperCase() + it.slice(1)}
                    </option>
                  ))}
                </select>
              </FormItem>

              <FormItem label="Priority">
                <select
                  className="sel"
                  value={formData.priority}
                  onChange={e => handleChange('priority', e.target.value as JobPriority)}
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>
                      {p.toUpperCase()}
                    </option>
                  ))}
                </select>
              </FormItem>

              <FormItem label="Recurring Schedule">
                <select
                  className="sel"
                  value={formData.recurring ?? ''}
                  onChange={e => handleChange('recurring', e.target.value ? parseInt(e.target.value) : null)}
                >
                  {RECURRING_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormItem>
            </div>

            <div className="g2">
              <FormItem label="Date" error={errors.date}>
                <input
                  type="date"
                  className="inp"
                  value={formData.date}
                  onChange={e => handleChange('date', e.target.value)}
                />
              </FormItem>

              <FormItem label="Time" error={errors.time}>
                <input
                  type="time"
                  className="inp"
                  value={formData.time}
                  onChange={e => handleChange('time', e.target.value)}
                />
              </FormItem>
            </div>

            <div className="g2">
              <FormItem label="Lead Technician" error={errors.leadTechId}>
                <select
                  className="sel"
                  value={formData.leadTechId}
                  onChange={e => handleChange('leadTechId', e.target.value)}
                >
                  <option value="">Select technician...</option>
                  {techs.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.specialty ? `— ${t.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </FormItem>

              <FormItem label="Co-Technician (Optional)">
                <select
                  className="sel"
                  value={formData.coTechId}
                  onChange={e => handleChange('coTechId', e.target.value)}
                >
                  <option value="">None</option>
                  {availableCoTechs.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.specialty ? `— ${t.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </FormItem>
            </div>

            <FormItem label="Scope of Work">
              <textarea
                className="ta"
                rows={4}
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe the scope of work..."
              />
            </FormItem>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p">
              Save Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
