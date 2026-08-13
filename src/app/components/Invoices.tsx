'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Download, CheckCircle, RefreshCw, X, Trash2, FileText, Mail, Search, ChevronDown, Check } from 'lucide-react';

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
  balance: number;
  discount?: number;
  paidAt?: string | null;
  notes?: string | null;
  customer: { id: string; name: string; email: string; phone: string; address: string };
  job?: { id: string; jobCardRef: string; title: string } | null;
  lineItems: LineItem[];
  payments?: { id: string; amount: number; method: string; reference?: string; receiptRef: string; receivedAt: string }[];
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

function CustomerSelect({
  customers,
  value,
  onChange,
}: {
  customers: Customer[];
  value: string;
  onChange: (value: string) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = customers.find((customer) => customer.id === value);
  const filtered = customers.filter((customer) => {
    const needle = query.trim().toLowerCase();
    return !needle || `${customer.name} ${customer.email}`.toLowerCase().includes(needle);
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  const choose = (customerId: string) => {
    onChange(customerId);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
          if (event.key === 'Escape') setOpen(false);
        }}
        className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate text-gray-900">
          {selected?.name || 'Select customer…'}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-gray-700 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[70] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
          <div className="border-b border-gray-100 bg-gray-50 p-2">
            <label htmlFor="invoice-customer-search" className="sr-only">Search customers</label>
            <input
              ref={searchRef}
              id="invoice-customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
              }}
              placeholder="Search customers..."
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div role="listbox" aria-label="Customers" className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => choose('')}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-gray-900 hover:bg-brand-50 hover:text-brand-700"
            >
              {!value ? <Check size={15} className="text-brand-600" /> : <span className="w-[15px]" />}
              Select customer…
            </button>
            {filtered.map((customer) => (
              <button
                key={customer.id}
                type="button"
                role="option"
                aria-selected={customer.id === value}
                onClick={() => choose(customer.id)}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-brand-50"
              >
                {customer.id === value ? <Check size={15} className="shrink-0 text-brand-600" /> : <span className="w-[15px] shrink-0" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">{customer.name}</span>
                  {customer.email && <span className="block truncate text-xs text-gray-700">{customer.email}</span>}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-gray-700">No matching customers</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-amber-50 text-amber-800',
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
  const [payment, setPayment] = useState({ amount: '', method: 'bank-transfer', reference: '' });
  const [paymentError, setPaymentError] = useState('');

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
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    const res = await fetch(`/api/invoices/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: invoice.balance || invoice.total, method: 'other', reference: 'Marked paid in CRM' }),
    });
    if (res.ok) {
      const { invoice: updated } = await res.json();
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
      if (selected?.id === id) setSelected(updated);
    }
  };

  const recordPayment = async () => {
    if (!selected || !payment.amount) return;
    setPaymentError('');
    const res = await fetch(`/api/invoices/${selected.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payment, amount: Number(payment.amount) }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setPaymentError(data.error || 'Could not record payment');
    setInvoices((current) => current.map((invoice) => invoice.id === selected.id ? data.invoice : invoice));
    setSelected(data.invoice); setPayment({ amount: '', method: 'bank-transfer', reference: '' });
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
                <p className="font-bold text-lg text-amber-700">BALANCE: ${(selected.balance ?? selected.total).toFixed(2)}</p>
              </div>

              {selected.payments && selected.payments.length > 0 && <div className="rounded-lg border border-gray-200 p-3"><p className="text-xs font-semibold uppercase text-gray-500 mb-2">Payment history</p>{selected.payments.map((entry) => <div key={entry.id} className="flex justify-between gap-3 border-t border-gray-100 py-2 text-sm"><div><p className="font-semibold">{entry.receiptRef}</p><p className="text-xs text-gray-500">{entry.method.replace('-', ' ')} - {new Date(entry.receivedAt).toLocaleDateString()}</p></div><span className="font-bold text-green-700">${entry.amount.toFixed(2)}</span></div>)}</div>}

              {selected.status !== 'paid' && selected.status !== 'cancelled' && <div className="rounded-lg border border-brand-100 bg-brand-50 p-4"><p className="text-sm font-bold text-gray-900 mb-3">Record partial or full payment</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><input className={inputCls} inputMode="decimal" placeholder={`Amount up to ${(selected.balance ?? selected.total).toFixed(2)}`} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /><select className={inputCls} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>{['cash','bank-transfer','ecocash','card','velocity','other'].map((method) => <option key={method} value={method}>{method.replace('-', ' ')}</option>)}</select><input className={inputCls} placeholder="Reference" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></div>{paymentError && <p className="text-xs text-red-700 mt-2">{paymentError}</p>}<div className="flex justify-end gap-2 mt-3"><button className={btnSec} onClick={() => setPayment({ ...payment, amount: String(selected.balance ?? selected.total) })}>Use full balance</button><button className={btnPri} onClick={recordPayment}>Record payment</button></div></div>}

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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setShowCreate(false)}>
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
                  <CustomerSelect
                    customers={customers}
                    value={form.customerId}
                    onChange={(customerId) => setForm((f) => ({ ...f, customerId, jobId: '' }))}
                  />
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
