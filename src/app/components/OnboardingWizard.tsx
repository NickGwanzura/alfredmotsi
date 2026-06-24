'use client';

import React, { useState } from 'react';
import { useToast } from './Toast';
import { X, Building2, Upload, CheckCircle, ArrowRight, ArrowLeft, Sparkles, FileText } from 'lucide-react';

interface WizardProps {
  onComplete: () => void;
  onClose: () => void;
}

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'company', label: 'Company' },
  { id: 'branding', label: 'Branding' },
  { id: 'finance', label: 'Finance' },
  { id: 'done', label: 'Done' },
];

export default function OnboardingWizard({ onComplete, onClose }: WizardProps) {
  const { success, error } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');

  const [form, setForm] = useState({
    name: 'Splash Air Conditioning',
    address: '661 Lorraine Drive, Bluffhill, Harare',
    phone: '0715212141 / 0773034528',
    email: 'info@splashaircrmzw.site',
    website: 'https://splashaircrmzw.site',
    tagline: 'Air Conditioning & Refrigeration Specialists',
    services: 'Installation, Maintenance, Repairs, Sales',
    vatRate: 15.5,
    vatNumber: '',
  });

  const set = (field: string, value: string | number) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, logoUrl: logoPreview || undefined, onboarded: true }),
      });
      if (res.ok) {
        success('Welcome!', 'Your company is set up. All PDFs will use your branding.');
        onComplete();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        error('Error', err.error);
      }
    } catch {
      error('Error', 'Network error');
    }
    setSaving(false);
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const inputCls = "h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
  const btnPri = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50";
  const btnSec = "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer";

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-brand-600 to-brand-700 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`w-2.5 h-2.5 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs text-gray-400 font-medium">{step + 1} of {STEPS.length}</p>
        </div>

        <div className="px-6 py-6 min-h-[300px]">
          {step === 0 && (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center mx-auto mb-5">
                <Sparkles size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Splash Air</h2>
              <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                Let&apos;s set up your company profile so all your PDFs, invoices, and reports have your branding.
              </p>
              <p className="text-xs text-gray-400">This only takes a minute.</p>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Company Details</h2>
              <div>
                <label className={labelCls}>Company Name</label>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <textarea className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full resize-vertical" rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Branding</h2>
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {logoPreview ? (
                    <div className="w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                      <Building2 size={28} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Company Logo</label>
                  <input type="file" accept="image/*" onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input className={inputCls} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. HVAC Specialists" />
              </div>
              <div>
                <label className={labelCls}>Services</label>
                <input className={inputCls} value={form.services} onChange={e => set('services', e.target.value)} placeholder="e.g. Installation, Maintenance" />
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input className={inputCls} value={form.website} onChange={e => set('website', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Finance & Tax</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>VAT Rate (%)</label>
                  <input className={inputCls} type="number" step="0.1" value={form.vatRate} onChange={e => set('vatRate', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className={labelCls}>Tax / VAT Number</label>
                  <input className={inputCls} value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-semibold text-xs">These settings affect all invoices and proformas.</p>
                <p className="text-xs mt-0.5">VAT rate applies to invoice calculations automatically.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re All Set!</h2>
              <p className="text-gray-500 text-sm mb-2 max-w-sm mx-auto leading-relaxed">
                Your company profile is configured. All generated PDFs — invoices, job cards, gas usage reports — will now include your branding.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 mt-4">
                <FileText size={16} />
                <span>Invoices, Job Cards &amp; Reports ready to go</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
          <button onClick={step === 0 ? onClose : prev} className={btnSec}>
            {step === 0 ? 'Skip' : <><ArrowLeft size={14} /> Back</>}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className={btnPri}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className={btnPri}>
              {saving ? 'Saving...' : 'Finish Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
