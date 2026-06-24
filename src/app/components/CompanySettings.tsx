'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { SectionTitle } from './ui';
import { Save, Building2, Upload, Loader2, CheckCircle } from 'lucide-react';

interface CompanyData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatRate: number;
  vatNumber: string;
  logoUrl: string;
  tagline: string;
  services: string;
  onboarded: boolean;
}

export default function CompanySettings() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const [form, setForm] = useState<CompanyData>({
    name: '', address: '', phone: '', email: '', website: '',
    vatRate: 15.5, vatNumber: '', logoUrl: '', tagline: '', services: '', onboarded: false,
  });

  useEffect(() => {
    fetch('/api/admin/company-profile')
      .then(r => r.json())
      .then(d => {
        setForm(d);
        if (d.logoUrl) setLogoPreview(d.logoUrl);
      })
      .catch(() => error('Failed to load', 'Could not load company settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof CompanyData, value: string | number | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If there's a new logo file, upload it as base64
      let logoUrl = form.logoUrl;
      if (logoFile) {
        logoUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read logo'));
          reader.readAsDataURL(logoFile);
        });
      }

      const res = await fetch('/api/admin/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, logoUrl, onboarded: true }),
      });

      if (res.ok) {
        const updated = await res.json();
        setForm(updated);
        setLogoFile(null);
        success('Settings saved', 'Company profile updated successfully');
      } else {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        error('Save failed', err.error);
      }
    } catch {
      error('Save failed', 'Network error');
    }
    setSaving(false);
  };

  const inputCls = "h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full";
  const textareaCls = "px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full resize-vertical";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand-600" />
    </div>
  );

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Company Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your company profile and branding for PDFs and invoices</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Company Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Company Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Company Name</label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your company name" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <textarea className={textareaCls} rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Company address" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone numbers" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className={labelCls}>Tagline</label>
              <input className={inputCls} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. HVAC Specialists" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Services</label>
              <input className={inputCls} value={form.services} onChange={e => set('services', e.target.value)} placeholder="e.g. Installation, Maintenance, Repairs" />
            </div>
          </div>
        </div>

        {/* Branding / Logo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Branding & Logo</SectionTitle>
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {logoPreview ? (
                <div className="w-32 h-32 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Company logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                  <Building2 size={32} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className={labelCls}>Upload Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
              <p className="text-xs text-gray-400 mt-1.5">Recommended: PNG or SVG, at least 200px wide. Logo is included on all PDFs and invoices.</p>
            </div>
          </div>
        </div>

        {/* Finance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionTitle>Finance & Tax</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>VAT Rate (%)</label>
              <input className={inputCls} type="number" step="0.1" value={form.vatRate} onChange={e => set('vatRate', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelCls}>VAT / Tax Number</label>
              <input className={inputCls} value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="e.g. ZW-12345678" />
            </div>
          </div>
        </div>

        {/* Save indicator */}
        {form.onboarded && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3">
            <CheckCircle size={16} />
            <span>Onboarding complete. All PDFs will use your company branding.</span>
          </div>
        )}
      </div>
    </div>
  );
}
