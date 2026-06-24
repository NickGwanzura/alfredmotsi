'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Download, CheckCircle, RefreshCw, X, Trash2, FileText, Mail, Search } from 'lucide-react';

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

const VBT = 15.5;

export default function Invoices({ customers, jobs }: { customers: Customer[]; jobs: Job[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const blankLine = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0, total: 0 });
  const [form, setForm] = useState({
    customerId: '',
    jobId: '',
    dueDate: '',
    taxRate: VBT,
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

  const filtered = invoices.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.invoiceRef.toLowerCase().includes(q) || i.customer.name.toLowerCase().includes(q);
    }
    return true;
  });

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
      setForm({ customerId: '', jobId: '', dueDate: '', taxRate: VBT, notes: '', lineItems: [blankLine()] });
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

  const emailInvoice = async (inv: Invoice) => {
    if (!inv.customer.email) return alert('Customer has no email address');
    setSendingEmail(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/email`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ Invoice sent to ${inv.customer.email}`);
      } else {
        alert(`❌ ${data.error || 'Failed to send'}`);
      }
    } catch {
      alert('❌ Network error');
    }
    setSendingEmail(null);
  };

  const inputCls = "h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full";
  const btnPri = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer";
  const btnSec = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer";

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} total · {invoices.filter((i) => i.status === 'paid').length} paid</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center justify-center w-9 h-9 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer bg-white">
            <RefreshCw size={15} className="text-gray-600" />
          </button>
          <button onClick={() => setShowCreate(true)} className={btnPri}>
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full h-11 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['', 'draft', 'sent', 'paid', 'overdue'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`h-8 px-3 text-xs rounded-full border cursor-pointer capitalize font-medium transition-colors ${statusFilter === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Ref', 'Customer', 'Issue Date', 'Due Date', 'Total', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No invoices found</p></td></tr>
            )}
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelected(inv)}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-600">{inv.invoiceRef}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{inv.customer.name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(inv.issueDate).toLocaleDateString('en-ZA')}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(inv.dueDate).toLocaleDateString('en-ZA')}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">${inv.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => downloadPdf(inv)} disabled={downloadingId === inv.id}
                      className="inline-flex items-center justify-center w-7 h-7 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 border-none cursor-pointer disabled:opacity-50" title="Download PDF">
                      <Download size={13} />
                    </button>
                    <button onClick={() => emailInvoice(inv)} disabled={sendingEmail === inv.id || !inv.customer.email}
                      className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border-none cursor-pointer disabled:opacity-50" title="Email Invoice">
                      <Mail size={13} />
                    </button>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => markPaid(inv.id)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-50 text-green-700 hover:bg-green-100 border-none cursor-pointer" title="Mark Paid">
                        <CheckCircle size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(inv.id)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-600 hover:bg-red-100 border-none cursor-pointer" title="Delete">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Invoice</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1 font-mono">{selected.invoiceRef}</h2>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold self-start mt-1 ${STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-600'}`}>{selected.status}</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Customer</p>
                  <p className="font-semibold text-gray-900">{selected.customer.name}</p>
                  <p className="text-gray-500">{selected.customer.email}</p>
                  <p className="text-gray-500">{selected.customer.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Details</p>
                  {selected.job && <p className="text-gray-900">{selected.job.jobCardRef} — {selected.job.title}</p>}
                  <p className="text-gray-500">Issued: {new Date(selected.issueDate).toLocaleDateString('en-ZA')}</p>
                  <p className="text-gray-500">Due: {new Date(selected.dueDate).toLocaleDateString('en-ZA')}</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-semibold">Description</th>
                      <th className="px-3 py-2 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.map((l, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-900">{l.description}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{l.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">${l.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">${l.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm space-y-1 text-right">
                <p className="text-gray-500">Subtotal: <span className="font-mono">${selected.subtotal.toFixed(2)}</span></p>
                <p className="text-gray-500">VAT ({VBT}%): <span className="font-mono">${selected.tax.toFixed(2)}</span></p>
                <p className="font-bold text-lg text-brand-600">TOTAL: ${selected.total.toFixed(2)}</p>
              </div>

              {selected.notes && <p className="text-xs text-gray-400 italic">{selected.notes}</p>}

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button onClick={() => downloadPdf(selected)} disabled={downloadingId === selected.id}
                  className={btnSec + " text-xs"}>
                  <Download size={14} /> {downloadingId === selected.id ? 'Generating…' : 'Download PDF'}
                </button>
                <button onClick={() => emailInvoice(selected)} disabled={sendingEmail === selected.id || !selected.customer.email}
                  className={btnSec + " text-xs"}>
                  <Mail size={14} /> {sendingEmail === selected.id ? 'Sending…' : 'Email PDF'}
                </button>
                {selected.status !== 'paid' && selected.status !== 'cancelled' && (
                  <button onClick={() => markPaid(selected.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 border-none cursor-pointer">
                    <CheckCircle size={14} /> Mark Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Invoices</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">New Invoice</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1"><X size={20} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Customer *</label>
                  <select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, jobId: '' }))}
                    className={inputCls}>
                    <option value="">Select customer…</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {form.customerId && (
                  <div>
                    <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Link to Job (optional)</label>
                    <select value={form.jobId} onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                      className={inputCls}>
                      <option value="">No job linked</option>
                      {jobs.filter((j) => j.customerId === form.customerId).map((j) => (
                        <option key={j.id} value={j.id}>{j.jobCardRef} — {j.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Due Date *</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">VAT Rate (%)</label>
                  <input type="number" step="0.1" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} className={inputCls} />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Line Items *</label>
                  <button onClick={() => setForm((f) => ({ ...f, lineItems: [...f.lineItems, blankLine()] }))}
                    className="text-xs text-brand-600 font-medium underline bg-transparent border-none cursor-pointer">+ Add line</button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_80px_80px_30px] gap-2 px-3 py-2 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <span>Description</span><span className="text-center">Qty</span><span className="text-right">Unit Price</span><span className="text-right">Total</span><span />
                  </div>
                  {form.lineItems.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_30px] gap-2 px-3 py-1.5 border-t border-gray-100 items-center">
                      <input value={l.description} onChange={(e) => updateLine(i, 'description', e.target.value)}
                        placeholder="Description…" className="h-8 px-2 text-xs border border-gray-200 rounded outline-none focus:ring-2 focus:ring-brand-500" />
                      <input type="number" value={l.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} min="1"
                        className="h-8 px-2 text-xs border border-gray-200 rounded text-center outline-none focus:ring-2 focus:ring-brand-500" />
                      <input type="number" value={l.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} min="0" step="0.01"
                        className="h-8 px-2 text-xs border border-gray-200 rounded text-right outline-none focus:ring-2 focus:ring-brand-500" />
                      <span className="text-xs text-right font-semibold text-gray-900">${l.total.toFixed(2)}</span>
                      {form.lineItems.length > 1 && (
                        <button onClick={() => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, j) => j !== i) }))}
                          className="h-7 w-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded border-none cursor-pointer bg-transparent">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="px-3 py-2 bg-gray-50 text-xs text-right space-y-0.5 border-t border-gray-100">
                    <p className="text-gray-500">Subtotal: <span className="font-mono font-semibold text-gray-900">${subtotal.toFixed(2)}</span></p>
                    <p className="text-gray-500">VAT ({form.taxRate}%): <span className="font-mono font-semibold text-gray-900">${tax.toFixed(2)}</span></p>
                    <p className="font-bold text-brand-600 text-sm">Total: ${total.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.customerId || !form.dueDate}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
