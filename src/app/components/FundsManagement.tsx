'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, X, Search, DollarSign,
  ArrowUpRight, Wallet, TrendingDown, Circle,
  Camera, Trash2, Pencil, Ban, Eye,
} from 'lucide-react';
import { FundAllocation, FundExpense, User } from '@/app/types';

interface FundsManagementProps {
  techs: User[];
  currentUser?: User;
}

const STATUS_BADGE: Record<string, { bg: string; txt: string; label: string }> = {
  active: { bg: 'bg-green-50', txt: 'text-green-700', label: 'Active' },
  exhausted: { bg: 'bg-amber-50', txt: 'text-amber-700', label: 'Exhausted' },
  closed: { bg: 'bg-gray-100', txt: 'text-gray-600', label: 'Closed' },
};

export default function FundsManagement({ techs, currentUser }: FundsManagementProps) {
  const [allocations, setAllocations] = useState<FundAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Create allocation modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', amount: '', techId: '', notes: '' });

  // Selected allocation for detail drill-down
  const [selected, setSelected] = useState<FundAllocation | null>(null);

  // Record expense modal
  const [showExpense, setShowExpense] = useState(false);
  const [expenseFund, setExpenseFund] = useState<FundAllocation | null>(null);
  // Editing an existing expense
  const [editingExpense, setEditingExpense] = useState<FundExpense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    jobId: '',
    receiptRef: '',
    notes: '',
  });
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [jobsLookup, setJobsLookup] = useState<{ id: string; jobCardRef: string; title: string }[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Receipt viewer
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/funds');
    if (res.ok) setAllocations(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Load jobs list when expense modal opens
  useEffect(() => {
    if ((showExpense || editingExpense) && jobsLookup.length === 0 && !jobsLoading) {
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
  }, [showExpense, editingExpense, jobsLookup.length, jobsLoading]);

  // When editingExpense changes, populate the form
  useEffect(() => {
    if (editingExpense) {
      setExpenseForm({
        description: editingExpense.description,
        amount: String(editingExpense.amount),
        jobId: editingExpense.jobId || '',
        receiptRef: editingExpense.receiptRef || '',
        notes: editingExpense.notes || '',
      });
      setReceiptPreview(editingExpense.receiptDataUrl || null);
    }
  }, [editingExpense]);

  // Summary stats — show only admin's full view
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const totalSpent = allocations.reduce((s, a) => s + a.spent, 0);
  const activeCount = allocations.filter((a) => a.status === 'active').length;

  const filtered = allocations.filter((a) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      (a.name || '').toLowerCase().includes(q) ||
      (a.tech?.name || '').toLowerCase().includes(q) ||
      (a.notes || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchQ && matchStatus;
  });

  // CREATE allocation
  const handleCreate = async () => {
    if (!createForm.amount || !createForm.techId) return;
    setSaving(true);
    await fetch('/api/admin/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createForm.name || null,
        amount: parseFloat(createForm.amount),
        techId: createForm.techId,
        notes: createForm.notes || null,
      }),
    });
    await load();
    setShowCreate(false);
    setCreateForm({ name: '', amount: '', techId: '', notes: '' });
    setSaving(false);
  };

  // CLOSE fund
  const handleCloseFund = async (fund: FundAllocation) => {
    if (!confirm(`Close this fund for ${fund.tech?.name}? No more expenses can be added.`)) return;
    setSaving(true);
    await fetch(`/api/admin/funds/${fund.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    await load();
    if (selected?.id === fund.id) {
      const res = await fetch(`/api/admin/funds/${fund.id}`);
      if (res.ok) setSelected(await res.json());
    }
    setSaving(false);
  };

  // DELETE allocation
  const handleDeleteFund = async (fund: FundAllocation) => {
    if (!confirm(`Permanently delete this fund allocation for ${fund.tech?.name} ($${fund.amount})? This also deletes all expenses.`)) return;
    setSaving(true);
    await fetch(`/api/admin/funds/${fund.id}`, { method: 'DELETE' });
    await load();
    setSelected(null);
    setSaving(false);
  };

  // RECORD / UPDATE expense
  const handleExpense = async () => {
    if (!expenseFund || !expenseForm.description || !expenseForm.amount) return;
    setSaving(true);

    // Convert receipt file to data URL if present
    let dataUrl = receiptPreview;
    if (receiptFile) {
      dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(receiptFile);
      });
    }

    const body = {
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      jobId: expenseForm.jobId || null,
      receiptRef: expenseForm.receiptRef || null,
      receiptDataUrl: dataUrl || null,
      notes: expenseForm.notes || null,
    };

    if (editingExpense) {
      // UPDATE existing expense
      await fetch(`/api/admin/funds/${expenseFund.id}/expenses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, expenseId: editingExpense.id }),
      });
    } else {
      // CREATE new expense
      await fetch(`/api/admin/funds/${expenseFund.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    await load();
    if (selected?.id === expenseFund.id) {
      const res = await fetch(`/api/admin/funds/${expenseFund.id}`);
      if (res.ok) setSelected(await res.json());
    }
    closeExpenseModal();
    setSaving(false);
  };

  // DELETE expense
  const handleDeleteExpense = async (fundId: string, expense: FundExpense) => {
    if (!confirm(`Delete expense "${expense.description}" ($${expense.amount})?`)) return;
    setSaving(true);
    await fetch(`/api/admin/funds/${fundId}/expenses`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId: expense.id }),
    });
    await load();
    if (selected?.id === fundId) {
      const res = await fetch(`/api/admin/funds/${fundId}`);
      if (res.ok) setSelected(await res.json());
    }
    setSaving(false);
  };

  const openExpenseModal = (fund: FundAllocation, expense?: FundExpense) => {
    setExpenseFund(fund);
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        description: expense.description,
        amount: String(expense.amount),
        jobId: expense.jobId || '',
        receiptRef: expense.receiptRef || '',
        notes: expense.notes || '',
      });
      setReceiptPreview(expense.receiptDataUrl || null);
    } else {
      setEditingExpense(null);
      setExpenseForm({ description: '', amount: '', jobId: '', receiptRef: '', notes: '' });
      setReceiptPreview(null);
    }
    setReceiptFile(null);
    setShowExpense(true);
  };

  const closeExpenseModal = () => {
    setShowExpense(false);
    setExpenseFund(null);
    setEditingExpense(null);
    setExpenseForm({ description: '', amount: '', jobId: '', receiptRef: '', notes: '' });
    setReceiptPreview(null);
    setReceiptFile(null);
  };

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
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
            {!isAdmin && currentUser && ` — Your funds`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 border-none cursor-pointer"
          >
            <Plus size={16} /> Allocate Funds
          </button>
        )}
      </div>

      {/* Summary Cards — admin only */}
      {isAdmin && (
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
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search name, technician, or notes…"
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
              <th className="px-4 py-3 text-left font-semibold">Name / Tech</th>
              <th className="px-4 py-3 text-left font-semibold">Allocated</th>
              <th className="px-4 py-3 text-left font-semibold">Spent</th>
              <th className="px-4 py-3 text-left font-semibold">Balance</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-secondary">
                  <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No fund allocations found</p>
                  <p className="text-xs mt-1">
                    {!isAdmin
                      ? 'You haven\'t been allocated any funds yet. Contact your admin.'
                      : 'Allocate funds to technicians to get started.'}
                  </p>
                </td>
              </tr>
            )}
            {filtered.map((alloc, i) => {
              const balance = alloc.amount - alloc.spent;
              const badge = STATUS_BADGE[alloc.status] || STATUS_BADGE.active;
              return (
                <tr key={alloc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{alloc.name || alloc.tech?.name || 'Unknown'}</p>
                    {alloc.name && <p className="text-xs text-text-secondary">{alloc.tech?.name || 'Unknown'}</p>}
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
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {new Date(alloc.createdAt).toLocaleDateString('en-ZA')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setSelected(selected?.id === alloc.id ? null : alloc)}
                        className="h-7 px-2 text-xs font-medium rounded bg-brand-50 text-brand-700 hover:bg-brand-100 border-none cursor-pointer"
                      >
                        {selected?.id === alloc.id ? 'Close' : 'Details'}
                      </button>
                      {(alloc.status === 'active' || isAdmin) && (
                        <button
                          onClick={() => openExpenseModal(alloc)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-green-50 text-green-700 hover:bg-green-100 border-none cursor-pointer"
                          title={editingExpense ? 'Edit Expense' : 'Record Expense'}
                        >
                          <ArrowUpRight size={13} />
                        </button>
                      )}
                      {isAdmin && alloc.status === 'active' && (
                        <button
                          onClick={() => handleCloseFund(alloc)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-orange-50 text-orange-600 hover:bg-orange-100 border-none cursor-pointer"
                          title="Close Fund"
                        >
                          <Ban size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteFund(alloc)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 border-none cursor-pointer"
                          title="Delete Fund"
                        >
                          <Trash2 size={13} />
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
                Expenses — {selected.name || selected.tech?.name || 'Unknown'}
              </span>
              {selected.notes && (
                <span className="text-xs text-text-secondary ml-3 italic">{selected.notes}</span>
              )}
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
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Job</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Receipt</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Recorded By</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(selected.expenses || []).map((exp, i) => (
                  <tr key={exp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                      {new Date(exp.recordedAt).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-text-primary">
                      {exp.description}
                      {exp.notes && <p className="text-xs text-text-secondary mt-0.5">{exp.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-red-600">-${exp.amount.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {exp.job ? (
                        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {exp.job.jobCardRef}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {exp.receiptDataUrl ? (
                        <button
                          onClick={() => setViewReceipt(exp.receiptDataUrl!)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer"
                        >
                          <Eye size={13} /> View
                        </button>
                      ) : exp.receiptRef ? (
                        <span className="text-xs text-text-secondary">{exp.receiptRef}</span>
                      ) : (
                        <span className="text-xs text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{exp.recordedBy?.name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openExpenseModal(selected, exp)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border-none cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(selected.id, exp)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 border-none cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
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
                  <td colSpan={4} />
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
                <label className="block text-xs font-medium text-text-secondary mb-1">Fund Name (optional)</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Project Alpha - Parts Budget"
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600"
                />
              </div>
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

      {/* Record / Edit Expense Modal */}
      {showExpense && expenseFund && (
        <div className="modal-overlay" onClick={closeExpenseModal}>
          <div className="modal max-w-lg p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">
                {editingExpense ? 'Edit Expense' : 'Record Expense'} — {expenseFund.tech?.name || 'Unknown'}
              </h3>
              <button onClick={closeExpenseModal} className="bg-transparent border-none cursor-pointer text-text-secondary">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-800">
                <strong>Available balance:</strong> ${(expenseFund.amount - expenseFund.spent).toFixed(2)}
                {editingExpense && (
                  <span className="ml-2 text-blue-600">
                    (editing: original ${editingExpense.amount.toFixed(2)})
                  </span>
                )}
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

              {/* Receipt Upload */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Receipt (optional)</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={expenseForm.receiptRef}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, receiptRef: e.target.value }))}
                      placeholder="Receipt reference / number"
                      className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 mb-2"
                    />
                    <label className="inline-flex items-center gap-2 h-8 px-3 text-xs font-medium border border-border-subtle rounded-lg bg-transparent hover:bg-surface-hover cursor-pointer">
                      <Camera size={14} />
                      {receiptPreview ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleReceiptFile}
                        className="hidden"
                      />
                    </label>
                    {receiptFile && (
                      <span className="text-xs text-text-secondary ml-2">{receiptFile.name}</span>
                    )}
                  </div>
                  {receiptPreview && (
                    <div className="relative shrink-0">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-16 h-16 object-cover rounded-lg border border-border-subtle"
                      />
                      <button
                        onClick={() => { setReceiptPreview(null); setReceiptFile(null); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white border-none cursor-pointer text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Supplier details, additional info…"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={closeExpenseModal}
                className="h-9 px-4 text-sm border border-border-subtle rounded-lg bg-transparent cursor-pointer hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleExpense}
                disabled={saving || !expenseForm.description || !expenseForm.amount}
                className="h-9 px-5 text-sm font-semibold bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingExpense ? 'Update Expense' : 'Record Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {viewReceipt && (
        <div className="modal-overlay" onClick={() => setViewReceipt(null)}>
          <div className="modal max-w-2xl p-4 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setViewReceipt(null)}
                className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            <img src={viewReceipt} alt="Receipt" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
