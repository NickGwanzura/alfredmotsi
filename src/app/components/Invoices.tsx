'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Download, CheckCircle, RefreshCw, X, Trash2, FileText } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceRef: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAt?: string | null;
  notes?: string | null;
  customer: { id: string; name: string; email: string; phone: string; address: string };
  job?: { id: string; jobCardRef: string; title: string } | null;
  lineItems: LineItem[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

interface Job {
  id: string;
  jobCardRef: string;
  title: string;
  customerId: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function Invoices({ customers, jobs }: { customers: Customer[]; jobs: Job[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const blankLine = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0, total: 0 });
  const [form, setForm] = useState({
    customerId: '',
    jobId: '',
    dueDate: '',
    taxRate: 15,
    notes: '',
    lineItems: [blankLine()],
  });

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/invoices');
    if (res.ok) setInvoices(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices;

  const updateLine = (idx: number, field: keyof LineItem, val: string | number) => {
    setForm((f) => {
      const lines = f.lineItems.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: typeof val === 'string' && field !== 'description' ? parseFloat(val) || 0 : val };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      });
      return { ...f, lineItems: lines };
    });
  };

  const subtotal = form.lineItems.reduce((s, l) => s + l.total, 0);
  const tax = subtotal * (form.taxRate / 100);
  const total = subtotal + tax;

  const handleCreate = async () => {
    if (!form.customerId || form.lineItems.some((l) => !l.description)) return;
    setSaving(true);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await load();
      setShowCreate(false);
      setForm({ customerId: '', jobId: '', dueDate: '', taxRate: 15, notes: '', lineItems: [blankLine()] });
    }
    setSaving(false);
  };

  const markPaid = async (id: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
      if (selected?.id === id) setSelected(updated);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const downloadPdf = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    const res = await fetch(`/api/invoices/${inv.id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.invoiceRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloadingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Invoices</h2>
          <p className="text-sm text-text-secondary mt-0.5">{invoices.length} total · {invoices.filter((i) => i.status === 'paid').length} paid</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 w-9 flex items-center justify-center border border-border-subtle rounded-lg hover:bg-surface-hover cursor-pointer">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 border-none cursor-pointer">
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4">
        {['', 'draft', 'sent', 'paid', 'overdue'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`h-7 px-3 text-xs rounded-full border cursor-pointer capitalize font-medium ${statusFilter === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-text-secondary border-border-subtle hover:bg-surface-hover'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-600 text-white text-xs">
            <tr>
              {['Ref', 'Customer', 'Date', 'Due', 'Total', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-text-secondary"><FileText size={32} className="mx-auto mb-2 opacity-30" /><p>No invoices found</p></td></tr>
            )}
            {filtered.map((inv, i) => (
              <tr key={inv.id} className={`cursor-pointer hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`} onClick={() => setSelected(inv)}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-600">{inv.invoiceRef}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{inv.customer.name}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(inv.issueDate).toLocaleDateString('en-ZA')}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(inv.dueDate).toLocaleDateString('en-ZA')}</td>
                <td className="px-4 py-3 font-semibold">${inv.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => downloadPdf(inv)} disabled={downloadingId === inv.id}
                      className="h-7 w-7 flex items-center justify-center rounded bg-brand-50 text-brand-600 hover:bg-brand-100 border-none cursor-pointer disabled:opacity-50" title="Download PDF">
                      <Download size={13} />
                    </button>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => markPaid(inv.id)}
                        className="h-7 w-7 flex items-center justify-center rounded bg-green-50 text-green-700 hover:bg-green-100 border-none cursor-pointer" title="Mark Paid">
                        <CheckCircle size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(inv.id)}
                      className="h-7 w-7 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 border-none cursor-pointer" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice detail panel */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal max-w-lg p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg font-mono">{selected.invoiceRef}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[selected.status] || ''}`}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="bg-transparent border-none cursor-pointer text-text-secondary"><X size={20} /></button>
            </div>
            <div className="text-sm space-y-1 mb-4">
              <p><strong>Customer:</strong> {selected.customer.name}</p>
              <p><strong>Email:</strong> {selected.customer.email}</p>
              {selected.job && <p><strong>Job:</strong> {selected.job.jobCardRef} — {selected.job.title}</p>}
              <p><strong>Issued:</strong> {new Date(selected.issueDate).toLocaleDateString('en-ZA')} · <strong>Due:</strong> {new Date(selected.dueDate).toLocaleDateString('en-ZA')}</p>
            </div>
            <div className="border border-border-subtle rounded-lg overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead className="bg-brand-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lineItems.map((l, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                      <td className="px-3 py-2 text-right">${l.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold">${l.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm space-y-1 text-right mb-4">
              <p className="text-text-secondary">Subtotal: ${selected.subtotal.toFixed(2)}</p>
              <p className="text-text-secondary">VAT: ${selected.tax.toFixed(2)}</p>
              <p className="font-bold text-base text-brand-600">TOTAL: ${selected.total.toFixed(2)}</p>
            </div>
            {selected.notes && <p className="text-xs text-text-secondary italic mb-4">{selected.notes}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => downloadPdf(selected)} disabled={downloadingId === selected.id}
                className="inline-flex items-center gap-2 h-9 px-4 text-sm bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50">
                <Download size={14} /> {downloadingId === selected.id ? 'Generating…' : 'Download PDF'}
              </button>
              {selected.status !== 'paid' && selected.status !== 'cancelled' && (
                <button onClick={() => markPaid(selected.id)}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm bg-green-600 text-white rounded-lg border-none cursor-pointer hover:bg-green-700">
                  <CheckCircle size={14} /> Mark Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal max-w-2xl p-6 rounded-xl" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">New Invoice</h3>
              <button onClick={() => setShowCreate(false)} className="bg-transparent border-none cursor-pointer text-text-secondary"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Customer *</label>
                <select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, jobId: '' }))}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white">
                  <option value="">Select customer…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {form.customerId && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Link to Job (optional)</label>
                  <select value={form.jobId} onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white">
                    <option value="">No job linked</option>
                    {jobs.filter((j) => j.customerId === form.customerId).map((j) => (
                      <option key={j.id} value={j.id}>{j.jobCardRef} — {j.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Due Date *</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">VAT Rate (%)</label>
                <input type="number" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600" />
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-text-secondary">Line Items *</label>
                <button onClick={() => setForm((f) => ({ ...f, lineItems: [...f.lineItems, blankLine()] }))}
                  className="text-xs text-brand-600 underline bg-transparent border-none cursor-pointer">+ Add line</button>
              </div>
              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_60px_80px_80px_30px] text-xs bg-brand-600 text-white px-3 py-2 gap-2">
                  <span>Description</span><span className="text-center">Qty</span><span className="text-right">Unit Price</span><span className="text-right">Total</span><span />
                </div>
                {form.lineItems.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_30px] gap-2 px-3 py-1.5 border-t border-border-subtle items-center">
                    <input value={l.description} onChange={(e) => updateLine(i, 'description', e.target.value)}
                      placeholder="Description…" className="h-8 px-2 text-xs border border-border-subtle rounded outline-none focus:border-brand-600" />
                    <input type="number" value={l.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} min="1"
                      className="h-8 px-2 text-xs border border-border-subtle rounded text-center outline-none focus:border-brand-600" />
                    <input type="number" value={l.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} min="0" step="0.01"
                      className="h-8 px-2 text-xs border border-border-subtle rounded text-right outline-none focus:border-brand-600" />
                    <span className="text-xs text-right font-semibold">${l.total.toFixed(2)}</span>
                    {form.lineItems.length > 1 && (
                      <button onClick={() => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, j) => j !== i) }))}
                        className="h-7 w-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded border-none cursor-pointer bg-transparent">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="px-3 py-2 bg-surface text-xs text-right space-y-0.5 border-t border-border-subtle">
                  <p className="text-text-secondary">Subtotal: ${subtotal.toFixed(2)}</p>
                  <p className="text-text-secondary">VAT ({form.taxRate}%): ${tax.toFixed(2)}</p>
                  <p className="font-bold text-brand-600">Total: ${total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 resize-none" />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="h-9 px-4 text-sm border border-border-subtle rounded-lg bg-transparent cursor-pointer hover:bg-surface-hover">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.customerId || !form.dueDate}
                className="h-9 px-5 text-sm font-semibold bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
