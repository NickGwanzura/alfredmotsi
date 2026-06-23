'use client';

import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Package, ArrowDown, ArrowUp, RefreshCw, Pencil, X } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  sku?: string;
  unit: string;
  stockLevel: number;
  reorderLevel: number;
  reorderQty: number;
  supplier?: string;
  costPrice?: number;
  sellPrice?: number;
  location?: string;
  notes?: string;
}

const CATEGORIES = ['Parts', 'Tools', 'Refrigerants', 'Electrical', 'Filters', 'Consumables', 'Other'];

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQty, setMovementQty] = useState('');
  const [movementRef, setMovementRef] = useState('');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [form, setForm] = useState<Partial<InventoryItem>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/inventory');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const lowStock = items.filter((i) => i.stockLevel <= i.reorderLevel);

  const filtered = items.filter((i) => {
    const q = filter.toLowerCase();
    const matchQ = !q || i.name.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q);
    const matchCat = !categoryFilter || i.category === categoryFilter;
    return matchQ && matchCat;
  });

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    await load();
    setShowAdd(false);
    setForm({});
    setSaving(false);
  };

  const handleMovement = async () => {
    if (!movementItem || !movementQty) return;
    setSaving(true);
    await fetch(`/api/inventory/${movementItem.id}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: movementType, quantity: parseFloat(movementQty), reference: movementRef }),
    });
    await load();
    setMovementItem(null);
    setMovementQty('');
    setMovementRef('');
    setSaving(false);
  };

  const stockColor = (item: InventoryItem) => {
    if (item.stockLevel === 0) return 'text-red-600 bg-red-50';
    if (item.stockLevel <= item.reorderLevel) return 'text-amber-600 bg-amber-50';
    return 'text-green-700 bg-green-50';
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Inventory</h2>
          <p className="text-sm text-text-secondary mt-0.5">{items.length} items · {lowStock.length} below reorder level</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 border-none cursor-pointer">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle size={16} /> {lowStock.length} item{lowStock.length > 1 ? 's' : ''} at or below reorder level
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <span key={i.id} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {i.name} — {i.stockLevel} {i.unit} left (reorder at {i.reorderLevel})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Search name or SKU…" value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border-subtle rounded-lg flex-1 outline-none focus:border-brand-600"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={load} className="h-9 w-9 flex items-center justify-center border border-border-subtle rounded-lg hover:bg-surface-hover cursor-pointer">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-600 text-white text-xs">
            <tr>
              {['Item', 'Category', 'SKU', 'Stock', 'Reorder At', 'Location', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-text-secondary"><Package size={32} className="mx-auto mb-2 opacity-30" /><p>No inventory items found</p></td></tr>
            )}
            {filtered.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-text-primary">{item.name}</p>
                  {item.brand && <p className="text-xs text-text-secondary">{item.brand}</p>}
                </td>
                <td className="px-4 py-3 text-text-secondary">{item.category}</td>
                <td className="px-4 py-3 text-text-secondary font-mono text-xs">{item.sku || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${stockColor(item)}`}>
                    {item.stockLevel} {item.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{item.reorderLevel} {item.unit}</td>
                <td className="px-4 py-3 text-text-secondary">{item.location || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setMovementItem(item); setMovementType('in'); }}
                      className="h-7 w-7 flex items-center justify-center rounded bg-green-50 text-green-700 hover:bg-green-100 border-none cursor-pointer" title="Stock In">
                      <ArrowDown size={13} />
                    </button>
                    <button onClick={() => { setMovementItem(item); setMovementType('out'); }}
                      className="h-7 w-7 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 border-none cursor-pointer" title="Stock Out">
                      <ArrowUp size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal max-w-lg p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">Add Inventory Item</h3>
              <button onClick={() => setShowAdd(false)} className="bg-transparent border-none cursor-pointer text-text-secondary"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Name *', key: 'name', required: true },
                { label: 'Brand', key: 'brand' },
                { label: 'SKU', key: 'sku' },
                { label: 'Unit *', key: 'unit', required: true, placeholder: 'each, kg, m…' },
                { label: 'Stock Level', key: 'stockLevel', type: 'number' },
                { label: 'Reorder Level *', key: 'reorderLevel', type: 'number', required: true },
                { label: 'Reorder Qty *', key: 'reorderQty', type: 'number', required: true },
                { label: 'Supplier', key: 'supplier' },
                { label: 'Cost Price', key: 'costPrice', type: 'number' },
                { label: 'Sell Price', key: 'sellPrice', type: 'number' },
                { label: 'Location', key: 'location', placeholder: 'Shelf A2…' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className={key === 'name' || key === 'supplier' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
                  <input
                    type={type || 'text'}
                    placeholder={placeholder}
                    value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Category *</label>
                <select value={form.category || ''} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600 bg-white">
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowAdd(false)} className="h-9 px-4 text-sm border border-border-subtle rounded-lg bg-transparent cursor-pointer hover:bg-surface-hover">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.unit || !form.category}
                className="h-9 px-5 text-sm font-semibold bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {movementItem && (
        <div className="modal-overlay" onClick={() => setMovementItem(null)}>
          <div className="modal max-w-sm p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">
                {movementType === 'in' ? 'Stock In' : movementType === 'out' ? 'Stock Out' : 'Adjustment'} — {movementItem.name}
              </h3>
              <button onClick={() => setMovementItem(null)} className="bg-transparent border-none cursor-pointer text-text-secondary"><X size={20} /></button>
            </div>
            <p className="text-sm text-text-secondary mb-4">Current stock: <strong>{movementItem.stockLevel} {movementItem.unit}</strong></p>
            <div className="flex gap-2 mb-4">
              {(['in', 'out', 'adjustment'] as const).map((t) => (
                <button key={t} onClick={() => setMovementType(t)}
                  className={`flex-1 h-8 text-xs font-semibold rounded-lg border cursor-pointer capitalize ${movementType === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-transparent text-text-secondary border-border-subtle hover:bg-surface-hover'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Quantity *</label>
                <input type="number" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} min="0"
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Reference (job card, PO, etc.)</label>
                <input type="text" value={movementRef} onChange={(e) => setMovementRef(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border-subtle rounded-lg outline-none focus:border-brand-600" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setMovementItem(null)} className="h-9 px-4 text-sm border border-border-subtle rounded-lg bg-transparent cursor-pointer hover:bg-surface-hover">Cancel</button>
              <button onClick={handleMovement} disabled={saving || !movementQty}
                className="h-9 px-5 text-sm font-semibold bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
