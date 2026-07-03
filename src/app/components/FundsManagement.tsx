'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, X, Search, DollarSign,
  ArrowUpRight, Wallet, TrendingDown, Circle,
} from 'lucide-react';
import { FundAllocation, FundExpense, User } from '@/app/types';

interface FundsManagementProps {
  techs: User[];
}

const STATUS_BADGE: Record<string, { bg: string; txt: string; label: string }> = {
  active: { bg: 'bg-green-50', txt: 'text-green-700', label: 'Active' },
  exhausted: { bg: 'bg-amber-50', txt: 'text-amber-700', label: 'Exhausted' },
  closed: { bg: 'bg-gray-100', txt: 'text-gray-600', label: 'Closed' },
};

export default function FundsManagement({ techs }: FundsManagementProps) {
  const [allocations, setAllocations] = useState<FundAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create allocation modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ amount: '', techId: '', notes: '' });

  // Selected allocation for detail drill-down
  const [selected, setSelected] = useState<FundAllocation | null>(null);

  // Record expense modal
  const [showExpense, setShowExpense] = useState(false);
  const [expenseFund, setExpenseFund] = useState<FundAllocation | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    jobId: '',
    notes: '',
  });
  const [jobsLookup, setJobsLookup] = useState<{ id: string; jobCardRef: string; title: string }[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/funds');
    if (res.ok) setAllocations(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Load jobs list when expense modal opens
  useEffect(() => {
    if (showExpense && jobsLookup.length === 0 && !jobsLoading) {
      setJobsLoading(true);
      fetch('/api/jobs')
        .then((r) => r.json())
        .then((data) => {
          setJobsLookup(
            (data || []).map((j: { id: string; jobCardRef: string; title: string }) => ({
              id: j.id,
              jobCardRef: j.jobCardRef,
              title: j.title,
            }))
          );
        })
        .catch(() => {})
        .finally(() => setJobsLoading(false));
    }
  }, [showExpense, jobsLookup.length, jobsLoading]);

  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const totalSpent = allocations.reduce((s, a) => s + a.spent, 0);
  const activeCount = allocations.filter((a) => a.status === 'active').length;

  const filtered = allocations.filter((a) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      (a.tech?.name || '').toLowerCase().includes(q) ||
      (a.notes || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleCreate = async () => {
    if (!createForm.amount || !createForm.techId) return;
    setSaving(true);
    await fetch('/api/admin/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(createForm.amount),
        techId: createForm.techId,
        notes: createForm.notes || null,
      }),
    });
    await load();
    setShowCreate(false);
    setCreateForm({ amount: '', techId: '', notes: '' });
    setSaving(false);
  };

  const handleExpense = async () => {
    if (!expenseFund || !expenseForm.description || !expenseForm.amount) return;
    setSaving(true);
    await fetch(`/api/admin/funds/${expenseFund.id}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        jobId: expenseForm.jobId || null,
        notes: expenseForm.notes || null,
      }),
    });
    await load();
    // Refresh selected if viewing
    if (selected?.id === expenseFund.id) {
      const res = await fetch(`/api/admin/funds/${expenseFund.id}`);
      if (res.ok) setSelected(await res.json());
    }
    setShowExpense(false);
    setExpenseFund(null);
    setExpenseForm({ description: '', amount: '', jobId: '', notes: '' });
    setSaving(false);
  };

  const openExpenseModal = (fund: FundAllocation) => {
    setExpenseFund(fund);
    setExpenseForm({ description: '', amount: '', jobId: '', notes: '' });
    setShowExpense(true);
  };

  const balanceColor = (balance: number) => {
    if (balance <= 0) return 'text-red-600';
    if (balance < 50) return 'text-amber-600';
    return 'text-green-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Funds Management</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {allocations.length} allocation{allocations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 border-none cursor-pointer"
        >
          <Plus size={16} /> Allocate Funds
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Wallet size={20} />
            </div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Allocated</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">${totalAllocated.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingDown size={20} />
            </div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Spent</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <Circle size={20} />
            </div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Active Funds</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search technician or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-3 text-sm border border-border-subtle rounded-lg w-full outline-none focus:border-brand-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="exhausted">Exhausted</option>
          <option value="closed">Closed</option>
        </select>
        <button
          onClick={load}
          className="h-9 w-9 flex items-center justify-center border border-border-subtle rounded-lg hover:bg-surface-hover cursor-pointer"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-600 text-white text-xs">
            <tr>
              {['Technician', 'Allocated', 'Spent', 'Balance', 'Status', 'Notes', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-text-secondary">
                  <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No fund allocations found</p>
                </td>
              </tr>
            )}
            {filtered.map((alloc, i) => {
              const balance = alloc.amount - alloc.spent;
              const badge = STATUS_BADGE[alloc.status] || STATUS_BADGE.active;
              return (
                <tr key={alloc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{alloc.tech?.name || 'Unknown'}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">${alloc.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">${alloc.spent.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-semibold ${balanceColor(balance)}`}>
                    ${balance.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.txt}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[160px] truncate">
                    {alloc.notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {new Date(alloc.createdAt).toLocaleDateString('en-ZA')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelected(selected?.id === alloc.id ? null : alloc)}
                        className="h-7 px-2 text-xs font-medium rounded bg-brand-50 text-brand-700 hover:bg-brand-100 border-none cursor-pointer"
                      >
                        {selected?.id === alloc.id ? 'Close' : 'Details'}
                      </button>
                      {alloc.status === 'active' && (
                        <button
                          onClick={() => openExpenseModal(alloc)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-green-50 text-green-700 hover:bg-green-100 border-none cursor-pointer"
                          title="Record Expense"
                        >
                          <ArrowUpRight size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Expenses Detail */}
      {selected && (
        <div className="mt-4 bg-white rounded-xl border border-border-subtle overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-text-primary">
                Expenses — {selected.tech?.name || 'Unknown'}
              </span>
              <span className="text-xs text-text-secondary ml-3">
                ${selected.spent.toFixed(2)} of ${selected.amount.toFixed(2)} used
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="h-7 w-7 flex items-center justify-center bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
          {(!selected.expenses || selected.expenses.length === 0) ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              No expenses recorded yet for this fund.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-text-secondary">
                <tr>
                  {['Date', 'Description', 'Amount', 'Job', 'Recorded By', 'Notes'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selected.expenses || []).map((exp, i) => (
                  <tr key={exp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                      {new Date(exp.recordedAt).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-text-primary">{exp.description}</td>
                    <td className="px-4 py-2.5 font-semibold text-red-600">-${exp.amount.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {exp.job ? (
                        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {exp.job.jobCardRef}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{exp.recordedBy?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-text-secondary max-w-[150px] truncate">
                      {exp.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-border-subtle">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-text-primary">Total</td>
                  <td className="px-4 py-2.5 font-semibold text-red-600">
                    -${(selected.expenses || []).reduce((s, e) => s + e.amount, 0).toFixed(2)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Create Allocation Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal max-w-md p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">Allocate Funds</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="bg-transparent border-none cursor-pointer text-text-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Technician *</label>
                <select
                  value={createForm.techId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, techId: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white"
                >
                  <option value="">Select technician…</option>
                  {techs.filter((t) => t.role === 'tech' || true).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Amount ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional — reason, project reference…"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="h-9 px-4 text-sm border border-border-subtle rounded-lg bg-transparent cursor-pointer hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.amount || !createForm.techId}
                className="h-9 px-5 text-sm font-semibold bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Allocate Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showExpense && expenseFund && (
        <div className="modal-overlay" onClick={() => { setShowExpense(false); setExpenseFund(null); }}>
          <div className="modal max-w-md p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">
                Record Expense — {expenseFund.tech?.name || 'Unknown'}
              </h3>
              <button
                onClick={() => { setShowExpense(false); setExpenseFund(null); }}
                className="bg-transparent border-none cursor-pointer text-text-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-800">
                <strong>Available balance:</strong> ${(expenseFund.amount - expenseFund.spent).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Description *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What was purchased?"
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Amount ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Job / Project (optional)</label>
                <select
                  value={expenseForm.jobId}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, jobId: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white"
                >
                  <option value="">No specific job</option>
                  {jobsLookup.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobCardRef} — {j.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Receipt ref, supplier details…"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setShowExpense(false); setExpenseFund(null); }}
                className="h-9 px-4 text-sm border border-border-subtle rounded-lg bg-transparent cursor-pointer hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleExpense}
                disabled={saving || !expenseForm.description || !expenseForm.amount}
                className="h-9 px-5 text-sm font-semibold bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Record Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
