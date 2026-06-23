'use client';

import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Briefcase, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface PortalJob {
  id: string;
  jobCardRef: string;
  title: string;
  status: string;
  date: string;
  time?: string;
  type: string;
  address?: string;
  technicians: { name: string; phone?: string }[];
}

interface PortalInvoice {
  id: string;
  invoiceRef: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
}

const JOB_STATUS_COLORS: Record<string, string> = {
  unallocated: 'bg-gray-100 text-gray-600',
  allocated: 'bg-blue-50 text-blue-700',
  'on-site': 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

const INV_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
};

export default function CustomerPortal({ customerName }: { customerName: string }) {
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [tab, setTab] = useState<'jobs' | 'invoices'>('jobs');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/portal/jobs');
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs || []);
      setInvoices(data.invoices || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const downloadPdf = async (inv: PortalInvoice) => {
    setDownloading(inv.id);
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
    setDownloading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');

  return (
    <div className="max-w-3xl mx-auto">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Welcome, {customerName}</h1>
        <p className="text-sm text-text-secondary mt-1">Track your service requests and view invoices</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-border-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <Briefcase size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{activeJobs.length}</p>
              <p className="text-xs text-text-secondary">Active Jobs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{completedJobs.length}</p>
              <p className="text-xs text-text-secondary">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{unpaidInvoices.length}</p>
              <p className="text-xs text-text-secondary">Unpaid Invoices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle mb-6">
        {(['jobs', 'invoices'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px bg-transparent cursor-pointer capitalize transition-all ${tab === t ? 'border-brand-600 text-text-primary font-semibold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t === 'jobs' ? `Service Jobs (${jobs.length})` : `Invoices (${invoices.length})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={load} className="h-9 w-9 flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer border-none bg-transparent">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Jobs tab */}
      {tab === 'jobs' && (
        <div className="space-y-3">
          {jobs.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <Briefcase size={32} className="mx-auto mb-2 opacity-30" />
              <p>No service jobs on record</p>
            </div>
          )}
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-brand-600 font-semibold">{job.jobCardRef}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${JOB_STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                      {job.status.replace('-', ' ')}
                    </span>
                  </div>
                  <h3 className="font-medium text-text-primary">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(job.date).toLocaleDateString('en-ZA')}{job.time ? ` at ${job.time}` : ''}</span>
                    <span className="capitalize">{job.type}</span>
                    {job.address && <span>{job.address}</span>}
                  </div>
                </div>
              </div>
              {job.technicians.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <p className="text-xs text-text-secondary mb-1">Assigned Technician{job.technicians.length > 1 ? 's' : ''}</p>
                  <div className="flex gap-3">
                    {job.technicians.map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[9px] font-bold">
                          {t.name.charAt(0)}
                        </div>
                        <span className="font-medium">{t.name}</span>
                        {t.phone && <span className="text-text-secondary">· {t.phone}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invoices tab */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          {invoices.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p>No invoices on record</p>
            </div>
          )}
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl border border-border-subtle p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-brand-600 font-semibold">{inv.invoiceRef}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${INV_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                  {inv.status === 'overdue' && <AlertTriangle size={13} className="text-red-500" />}
                </div>
                <div className="text-xs text-text-secondary">
                  Issued {new Date(inv.issueDate).toLocaleDateString('en-ZA')} · Due {new Date(inv.dueDate).toLocaleDateString('en-ZA')}
                </div>
                <p className="text-base font-bold text-text-primary mt-1">${inv.total.toFixed(2)}</p>
              </div>
              <button onClick={() => downloadPdf(inv)} disabled={downloading === inv.id}
                className="inline-flex items-center gap-2 h-9 px-4 text-sm bg-brand-600 text-white rounded-lg border-none cursor-pointer hover:bg-brand-700 disabled:opacity-50">
                <Download size={14} />
                {downloading === inv.id ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
