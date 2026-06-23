'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Job,
  User,
  Customer,
  JobStatus,
  Diagnostics,
  Comment,
  AlertType,
  UnitType,
  RefrigerantType,
  SystemStatus,
  Consumable,
  ConsumableType,
  GasUsageRecord,
  JobAttachment,
} from '@/app/types';
import { SEED_USERS } from '@/app/data/seed';
import { STATUS_CFG, TYPE_CFG, ALERT_CFG, REFRIGERANT_TYPES } from '@/app/lib/config';
import { fmtDate, nowTime, runAlerts, formatDuration, buildWA, buildMail, reminderMsg, DIAG_THRESHOLDS, num, deriveSystemStatus } from '@/app/lib/utils';
import { REFRIGERANT_INFO, getPressureThresholds } from '@/app/lib/refrigerants';
import { getGasUsageWarning } from '@/app/lib/gasUsageWarning';
import { StatusTag, PrioTag, SectionTitle, Notification, FormItem, AlertTag } from './ui';
import SignaturePad from './SignaturePad';
import { captureAudit } from '@/app/lib/audit/capture';
import { canDeleteJobs, canManageJobs } from '@/app/lib/permissions';
import { X, Play, Square, Printer, Camera, Download, Plus, Trash2 } from 'lucide-react';

interface JobCardModalProps {
  job: Job;
  customers: Customer[];
  currentUser: User;
  gasUsage?: GasUsageRecord[];
  onClose: () => void;
  onUpdate: (job: Job) => void;
  onDelete?: (jobId: string, reason: string) => Promise<boolean> | boolean;
  onPrint?: (job: Job) => void;
}

const TABS = ["details", "diagnostics", "media", "sign-off", "ods", "consumables"] as const;
type Tab = typeof TABS[number];

const CONSUMABLE_TYPES: ConsumableType[] = ['gas', 'compressor', 'part', 'other'];
const CONSUMABLE_UNITS = ['kg', 'unit', 'pcs', 'L', 'set', 'm'];

const UNIT_TYPE_OPTIONS: UnitType[] = [
  "Split System", "Ducted", "Package Unit", "Multi-Head", "Cassette",
  "VRV/VRF", "Refrigeration System", "Chiller", "Heat Pump", "Precision Cooling"
];

const REFRIGERANT_OPTIONS: (RefrigerantType | string)[] = REFRIGERANT_TYPES;

export default function JobCardModal({ job, customers, currentUser, gasUsage = [], onClose, onUpdate, onDelete, onPrint }: JobCardModalProps) {
  const cust = useMemo(() => customers.find(c => c.id === job.customerId), [customers, job.customerId]) || {} as Customer;
  const userRole = currentUser.role;
  const isAssigned = job.techIds.includes(currentUser.id);
  const canEdit = userRole === 'admin' || isAssigned;

  const [tab, setTab] = useState<Tab>("details");
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>(job.comments || []);
  const [jobCardRef, setJCR] = useState(job.jobCardRef || "");
  const [sig, setSig] = useState<string | null>(job.signature);
  const [photos, setPhotos] = useState<string[]>(job.photos || []);
  const [clockIn, setCIn] = useState<string | null>(job.clockIn);
  const [clockOut, setCOut] = useState<string | null>(job.clockOut);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const blankDiag: Diagnostics = { 
    voltage: "", current: "", avgTemp: "", maxTemp: "", suction: "", discharge: "",
    refrigerantType: "R-410A", refrigerantRecovered: 0, refrigerantUsed: 0, refrigerantReused: 0,
    status: "optimal", notes: "", deltaT: "", brand: "", serial: "", unitType: undefined 
  };
  
  const [diag, setDiag] = useState<Diagnostics>(job.diagnostics || blankDiag);
  const [alerts, setAlerts] = useState<AlertType[]>(job.alerts || []);

  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [newConsumable, setNewConsumable] = useState({ type: 'part' as ConsumableType, name: '', brand: '', quantity: '', unit: 'unit', notes: '' });

  const [showGasLog, setShowGasLog] = useState(false);
  const [gasStock, setGasStock] = useState<{ id: string; gasType: string; brand: string; remaining: number; unit: string }[]>([]);
  const [gasStockLoading, setGasStockLoading] = useState(false);
  const [gasForm, setGasForm] = useState({ stockId: '', quantityUsed: '', purpose: '' });
  const [gasSubmitting, setGasSubmitting] = useState(false);
  const [gasSuccess, setGasSuccess] = useState<string | null>(null);
  const [gasError, setGasError] = useState<string | null>(null);
  const [gasMismatchWarning, setGasMismatchWarning] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { captureAudit('view_job', job.id); }, [job.id]);

  useEffect(() => {
    if (tab !== 'ods' && !showGasLog) return;
    setGasStockLoading(true);
    fetch('/api/gas-stock')
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setGasStock(d) : null)
      .catch(() => null)
      .finally(() => setGasStockLoading(false));
  }, [tab, showGasLog]);

  useEffect(() => {
    if (tab === 'consumables') {
      setConsumablesLoading(true);
      fetch(`/api/consumables?jobId=${job.id}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) ? setConsumables(d) : null)
        .catch(() => null)
        .finally(() => setConsumablesLoading(false));
    }
  }, [tab, job.id]);

  useEffect(() => {
    if (tab !== 'media') return;
    setAttachmentsLoading(true);
    setAttachmentError(null);
    fetch(`/api/jobs/${job.id}/attachments`)
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || 'Failed to load attachments.');
        if (Array.isArray(data)) setAttachments(data);
      })
      .catch(err => setAttachmentError(err instanceof Error ? err.message : 'Failed to load attachments.'))
      .finally(() => setAttachmentsLoading(false));
  }, [tab, job.id]);

  const handleAddConsumable = async () => {
    if (!newConsumable.name || !newConsumable.quantity) return;
    const res = await fetch('/api/consumables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newConsumable, jobId: job.id, quantity: parseFloat(newConsumable.quantity) }),
    });
    if (res.ok) {
      const created = await res.json();
      setConsumables(p => [created, ...p]);
      setNewConsumable({ type: 'part', name: '', brand: '', quantity: '', unit: 'unit', notes: '' });
    }
  };

  const handleDeleteConsumable = async (id: string) => {
    const res = await fetch(`/api/consumables/${id}`, { method: 'DELETE' });
    if (res.ok) setConsumables(p => p.filter(c => c.id !== id));
  };

  const submitGasUsage = async () => {
    setGasError(null);
    if (!gasForm.stockId || !gasForm.quantityUsed) { setGasError('Select a gas stock item and enter quantity.'); return; }
    const qty = parseFloat(gasForm.quantityUsed);
    if (isNaN(qty) || qty <= 0) { setGasError('Quantity must be a positive number.'); return; }
    const selected = gasStock.find(s => s.id === gasForm.stockId);
    if (selected && qty > selected.remaining) { setGasError(`Only ${selected.remaining} ${selected.unit} remaining in stock.`); return; }
    setGasSubmitting(true);
    try {
      const res = await fetch('/api/gas-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId: gasForm.stockId, gasType: selected?.gasType || '', quantityUsed: qty, customer: cust.name || '', jobId: job.id, purpose: gasForm.purpose || '' }),
      });
      const data = await res.json();
      if (res.ok) {
        setGasSuccess(`${qty} ${selected?.unit || 'kg'} of ${selected?.gasType} logged successfully.`);
        setGasError(null); setGasMismatchWarning(null);
        if (selected) {
          const currentType = (diag.refrigerantType || '').trim();
          const loggedType = (selected.gasType || '').trim();
          if (!currentType) { setD('refrigerantType', loggedType); setD('refrigerantUsed', (diag.refrigerantUsed || 0) + qty); }
          else if (currentType === loggedType) { setD('refrigerantUsed', (diag.refrigerantUsed || 0) + qty); }
          else { setGasMismatchWarning(`Logged ${loggedType} but system refrigerant is ${currentType} — verify before sign-off.`); }
        }
        setGasForm({ stockId: '', quantityUsed: '', purpose: '' });
        setShowGasLog(false);
        setGasStock(prev => prev.map(s => s.id === gasForm.stockId ? { ...s, remaining: s.remaining - qty } : s));
      } else { setGasError(data.error || 'Failed to record gas usage.'); }
    } catch { setGasError('Network error — please try again.'); }
    finally { setGasSubmitting(false); }
  };

  const setD = (k: keyof Diagnostics, v: string | number | undefined) =>
    setDiag(prev => ({ ...prev, [k]: v }));

  const runCheck = () => { const a = runAlerts(diag); setAlerts(a); return a; };

  const hasAnyDiagnosticData = (d: Diagnostics): boolean => {
    const stringFields: (keyof Diagnostics)[] = ['voltage', 'current', 'suction', 'discharge', 'avgTemp', 'maxTemp', 'deltaT', 'notes', 'brand', 'serial', 'unitType', 'refrigerantType'];
    for (const k of stringFields) { const v = d[k]; if (typeof v === 'string' && v.trim() !== '') return true; }
    if ((d.refrigerantRecovered || 0) > 0) return true;
    if ((d.refrigerantUsed || 0) > 0) return true;
    if ((d.refrigerantReused || 0) > 0) return true;
    return false;
  };

  const electricalsDone = !!(diag.voltage?.trim() && diag.current?.trim());
  const pressuresDone = !!(diag.suction?.trim() && diag.discharge?.trim());
  const statusSet = !!(diag.status && diag.status !== 'optimal');
  const notesPresent = !!diag.notes?.trim();
  const diagDone = electricalsDone || pressuresDone || statusSet || notesPresent;
  const canSign = job.type === "sales" || diagDone;
  const dur = formatDuration(clockIn, clockOut);
  const t = TYPE_CFG[job.type] || TYPE_CFG.repair;

  const techName = job.techIds.map(id => SEED_USERS.find(u => u.id === id)?.name || id).join(", ");
  const coName = (job.coTechIds || []).map(id => SEED_USERS.find(u => u.id === id)?.name || id).join(", ");

  const save = () => {
    const a = runCheck();
    const co = status === "completed" ? (clockOut || nowTime()) : clockOut;
    if (status === "completed") captureAudit('complete_job', job.id);
    else captureAudit('edit_job', job.id);
    onUpdate({ ...job, status, clockIn, clockOut: co, diagnostics: hasAnyDiagnosticData(diag) ? diag : job.diagnostics, alerts: a, signature: sig, photos, jobCardRef, comments });
    onClose();
  };

  const handleClockIn = async () => {
    const time = nowTime();
    setCIn(time);
    setStatus("on-site");
    const gps = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 6000 }
      );
    });
    fetch(`/api/jobs/${job.id}/clock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'in', gps }),
    }).catch(() => {});
  };

  const handleClockOut = async () => {
    const time = nowTime();
    setCOut(time);
    const gps = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 6000 }
      );
    });
    fetch(`/api/jobs/${job.id}/clock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'out', gps }),
    }).catch(() => {});
  };
  const handleAddComment = () => { if (!comment.trim()) return; setComments(p => [...p, { author: currentUser.name, text: comment, time: nowTime() }]); setComment(""); };
  const handleAddPhoto = () => { setPhotos(p => [...p, `photo_${Date.now()}.jpg`]); };

  const handleUploadAttachment = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setAttachmentError(null);
    if (file.size > 6 * 1024 * 1024) { setAttachmentError('Choose a file that is 6 MB or smaller.'); return; }
    setUploadingAttachment(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/jobs/${job.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', size: file.size, dataUrl }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || 'Failed to upload attachment.');
      setAttachments(p => [created, ...p]);
    } catch (err) { setAttachmentError(err instanceof Error ? err.message : 'Failed to upload attachment.'); }
    finally { setUploadingAttachment(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleWhatsAppReminder = () => { window.open(buildWA(cust.whatsapp || cust.phone, reminderMsg(job, cust, false)), '_blank'); };
  const handleEmailReminder = () => { window.location.href = buildMail(cust.email, `Service Reminder: ${job.title}`, reminderMsg(job, cust, false)); };
  const handlePrint = () => { if (onPrint) onPrint(job); else window.print(); };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    const trimmed = deleteReason.trim();
    if (!trimmed) { setDeleteError('Please provide a reason for deleting this job.'); return; }
    setDeleting(true); setDeleteError(null);
    try {
      const ok = await onDelete(job.id, trimmed);
      if (ok) { setShowDeleteConfirm(false); onClose(); }
      else { setDeleteError('Failed to delete job. Please try again.'); }
    } catch { setDeleteError('Failed to delete job. Please try again.'); }
    finally { setDeleting(false); }
  };

  const toNum = (v: unknown): number => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : 0;
  };
  const refrigerantNet = toNum(diag.refrigerantUsed) - toNum(diag.refrigerantRecovered);

  return (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-start justify-center overflow-y-auto p-4 sm:p-8 lg:p-12" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-layer w-full max-w-[780px] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border-subtle">
          <div>
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-[0.08em]">{job.id} — {t.label}</p>
            <h2 className="text-xl font-semibold text-text-primary mt-1">{job.title}</h2>
            <div className="flex gap-1 mt-2 flex-wrap">
              <StatusTag status={status} />
              <PrioTag p={job.priority} />
              {alerts.map(a => <AlertTag key={a} alert={a} />)}
              {job.recurring && (
                <span className="inline-flex items-center h-6 px-2 text-[11px] bg-[#f0f0f0] text-text-primary">
                  ↻ Recurring
                </span>
              )}
            </div>
          </div>
          <button className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary p-1" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Time Tracking Bar */}
        {canEdit && job.type !== "sales" && (
          <div className="bg-surface-hover border-b border-border-subtle px-6 py-3 flex items-center gap-3 flex-wrap">
            <div className="min-w-[150px]">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] mb-0.5">Technician workflow</p>
              <p className="text-xs text-text-secondary m-0">{clockIn ? `Clocked in ${clockIn}` : 'Start when arriving on site'}</p>
            </div>
            {!clockIn ? (
              <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-support-success text-white border-none cursor-pointer hover:bg-[#166331] transition-colors min-h-[44px]" onClick={handleClockIn}>
                <Play size={16} /> Clock In
              </button>
            ) : (
              <span className="mono text-support-success font-semibold">IN {clockIn}</span>
            )}
            {clockIn && !clockOut ? (
              <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-support-error text-white border-none cursor-pointer hover:bg-[#b81922] transition-colors min-h-[44px]" onClick={handleClockOut}>
                <Square size={16} /> Clock Out
              </button>
            ) : clockOut && (
              <span className="mono text-support-error font-semibold">OUT {clockOut}</span>
            )}
            {dur && <span className="mono text-text-secondary">Duration: {dur}</span>}
          </div>
        )}

        {/* Quick Action Bar */}
        {canEdit && (
          <div className="border-b border-border-subtle p-3 px-6 grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2 bg-layer">
            <button className="inline-flex items-center justify-center h-11 px-3 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setTab('diagnostics')}>
              Diagnostics {diagDone ? 'started' : 'start'}
            </button>
            <button className="inline-flex items-center justify-center h-11 px-3 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setTab('ods')}>
              Gas usage
            </button>
            <button className="inline-flex items-center justify-center h-11 px-3 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors gap-1.5" onClick={() => setTab('media')}>
              <Camera size={16} /> Photos
            </button>
            <button className="inline-flex items-center justify-center h-11 px-3 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setTab('sign-off')}>
              {sig ? 'Signed' : 'Signature'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border-subtle">
          {TABS.map(tName => (
            <div 
              key={tName} 
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] cursor-pointer select-none transition-colors ${
                tab === tName 
                  ? 'text-text-primary border-b-2 border-interactive bg-layer' 
                  : 'text-text-secondary hover:text-text-primary bg-surface'
              }`}
              onClick={() => setTab(tName)}
            >
              {tName === "sign-off" ? "Sign-Off" :
               tName === "ods" ? "ODS" :
               tName === "consumables" ? "Consumables" :
               tName.charAt(0).toUpperCase() + tName.slice(1)}
            </div>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {(() => {
            const warn = getGasUsageWarning(job, gasUsage, job.id);
            if (!warn) return null;
            const isOverdue = warn.level === 'overdue';
            return (
              <div className={`flex items-start gap-3 p-4 mb-4 border-l-4 cursor-pointer ${isOverdue ? 'bg-red-50 border-l-support-error' : 'bg-amber-50 border-l-support-warning'}`}
                onClick={() => setTab('ods')} role="button" title="Click to open the ODS tab and log gas usage">
                <div>
                  <div className="font-semibold text-sm text-text-primary">{isOverdue ? 'Refrigerant usage not logged' : 'Log refrigerant usage'}</div>
                  <div className="text-sm text-text-secondary">{warn.message}</div>
                </div>
              </div>
            );
          })()}

          {/* Details Tab */}
          {tab === "details" && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-layer p-4 border border-border-subtle">
                  <SectionTitle>Customer</SectionTitle>
                  <p className="font-semibold mb-1 text-text-primary">{cust.name}</p>
                  <p className="text-sm text-text-secondary">{cust.phone}</p>
                  <p className="text-sm text-text-secondary">{cust.email}</p>
                </div>
                <div className="bg-layer p-4 border border-border-subtle">
                  <SectionTitle>Scheduled</SectionTitle>
                  <p className="font-semibold mb-1 text-text-primary">{fmtDate(job.date)} at {job.time}</p>
                  <p className="text-sm text-text-secondary">Unit type: {job.unitType}</p>
                </div>
              </div>
              
              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Site Address</SectionTitle>
                <p className="mb-1 text-text-primary">{cust.address}</p>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(cust.address || "")}`} target="_blank" rel="noreferrer" className="text-sm text-interactive no-underline font-medium cursor-pointer">
                  Open in Google Maps →
                </a>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Scope of Work</SectionTitle>
                <p className="text-sm text-text-secondary leading-relaxed">{job.description}</p>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Team</SectionTitle>
                <p className="mb-0.5 text-text-primary">Lead technician: <strong>{techName}</strong></p>
                {coName && <p className="text-sm text-text-secondary">Assisting: <strong className="text-text-primary">{coName}</strong></p>}
              </div>

              {(job.history || []).length > 0 && (
                <div className="bg-layer p-4 border border-border-subtle mb-4">
                  <SectionTitle>Site Service History</SectionTitle>
                  <div>
                    {job.history.map((h, i) => (
                      <div key={i} className="flex gap-2 py-2 border-b border-border-subtle last:border-none">
                        <span className="mono text-xs text-text-secondary shrink-0">{h.date}</span>
                        <span className="text-sm text-text-primary">{h.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Customer Communication</SectionTitle>
                <div className="flex gap-2 flex-wrap">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#25D366] text-white border-none cursor-pointer hover:opacity-90 transition-opacity" onClick={handleWhatsAppReminder}>
                    WhatsApp Reminder
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#0052CC] text-white border-none cursor-pointer hover:opacity-90 transition-opacity" onClick={handleEmailReminder}>
                    Email Reminder
                  </button>
                  {onPrint && (
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={handlePrint}>
                      <Printer size={14} /> Print / PDF
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-layer p-4 border border-border-subtle">
                <SectionTitle>Comments ({comments.length})</SectionTitle>
                {comments.map((c, i) => (
                  <div key={i} className="py-3 border-b border-border-subtle last:border-none">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-semibold text-xs text-interactive">{c.author}</span>
                      <span className="mono text-xs text-text-helper">{c.time}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{c.text}</p>
                  </div>
                ))}
                {canEdit && (
                  <div className="mt-4">
                    <FormItem label="Add comment">
                      <textarea 
                        className="w-full h-20 px-3 py-2 text-sm text-text-primary bg-[#f9fafb] border border-border-strong outline-none transition-colors focus:border-interactive focus:bg-white resize-vertical"
                        placeholder="Describe progress, observations, or issues..." 
                        value={comment} 
                        onChange={e => setComment(e.target.value)} 
                      />
                    </FormItem>
                    <button className="inline-flex items-center px-3 py-1.5 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={handleAddComment}>
                      Post Comment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnostics Tab */}
          {tab === "diagnostics" && (
            <div className="animate-fade-in">
              {alerts.map(a => (
                <Notification key={a} kind="e" title={`${ALERT_CFG[a]?.icon} ${ALERT_CFG[a]?.label}`} body="This reading exceeds safe operating thresholds. Admin has been notified." />
              ))}

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>1 — Equipment Identification</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormItem label="Machine type">
                    <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={diag.unitType || ""} onChange={e => setD("unitType", e.target.value as UnitType)}>
                      <option value="">Select</option>
                      {UNIT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormItem>
                  <FormItem label="Brand / Model">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. Samsung AR18" value={diag.brand || ""} onChange={e => setD("brand", e.target.value)} />
                  </FormItem>
                  <FormItem label="Serial number" helper="Enter manually or scan barcode">
                    <div className="flex">
                      <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="Serial number" value={diag.serial || ""} onChange={e => setD("serial", e.target.value)} />
                      <button className="shrink-0 inline-flex items-center justify-center px-2 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" aria-label="Scan barcode" title="Scan">
                        <Camera size={14} />
                      </button>
                    </div>
                  </FormItem>
                </div>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>2 — Electrical Readings</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormItem label="Supply voltage (V)" error={(() => { const v = num(diag.voltage); return v !== null && v < DIAG_THRESHOLDS.minVoltage ? `Below ${DIAG_THRESHOLDS.minVoltage} V minimum — LOW_VOLTAGE alert` : undefined; })()}>
                    <input className={`w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors ${(() => { const v = num(diag.voltage); return v !== null && v < DIAG_THRESHOLDS.minVoltage ? 'border-support-error' : ''; })()}`} type="number" placeholder="e.g. 230" value={diag.voltage || ""} onChange={e => setD("voltage", e.target.value)} />
                  </FormItem>
                  <FormItem label="Current draw (A)" error={(() => { const v = num(diag.current); return v !== null && v > DIAG_THRESHOLDS.maxCurrent ? `Exceeds ${DIAG_THRESHOLDS.maxCurrent} A max — HIGH_CURRENT alert` : undefined; })()}>
                    <input className={`w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors ${(() => { const v = num(diag.current); return v !== null && v > DIAG_THRESHOLDS.maxCurrent ? 'border-support-error' : ''; })()}`} type="number" placeholder="e.g. 12.5" value={diag.current || ""} onChange={e => setD("current", e.target.value)} />
                  </FormItem>
                  <FormItem label="Refrigerant type">
                    <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={diag.refrigerantType || "R-410A"} onChange={e => setD("refrigerantType", e.target.value)}>
                      {REFRIGERANT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormItem>
                </div>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>3 — Thermal Readings</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormItem label="Avg operating temp (°C)">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" placeholder="e.g. 22" value={diag.avgTemp || ""} onChange={e => setD("avgTemp", e.target.value)} />
                  </FormItem>
                  <FormItem label="Max design temp (°C)">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" placeholder="e.g. 40" value={diag.maxTemp || ""} onChange={e => setD("maxTemp", e.target.value)} />
                  </FormItem>
                  <FormItem label="Delta T — return vs supply (°C)" helper="Measures cooling efficiency">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" placeholder="e.g. 11" value={diag.deltaT || ""} onChange={e => setD("deltaT", e.target.value)} />
                  </FormItem>
                </div>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>4 — Refrigeration Pressure Test</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'suction' as const, label: 'Suction pressure (PSI)', placeholder: 'e.g. 68' },
                    { key: 'discharge' as const, label: 'Discharge pressure (PSI)', placeholder: 'e.g. 245' },
                  ].map(field => (
                    <FormItem key={field.key} label={field.label} error={(() => {
                      const v = num(diag[field.key]);
                      if (v === null) return undefined;
                      const p = getPressureThresholds(diag.refrigerantType);
                      const isSuction = field.key === 'suction';
                      const min = isSuction ? p.suctionMin : p.dischargeMin;
                      const max = isSuction ? p.suctionMax : p.dischargeMax;
                      if (v < min) return `${field.key.charAt(0).toUpperCase() + field.key.slice(1)} ${v} PSI is below ${p.refrigerant} normal range (${min}-${max} PSI)`;
                      if (v > max) return `${field.key.charAt(0).toUpperCase() + field.key.slice(1)} ${v} PSI is above ${p.refrigerant} normal range (${min}-${max} PSI)`;
                      return undefined;
                    })()}>
                      <input className={`w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors ${(() => {
                        const v = num(diag[field.key]); if (v === null) return '';
                        const p = getPressureThresholds(diag.refrigerantType);
                        const isSuction = field.key === 'suction';
                        const min = isSuction ? p.suctionMin : p.dischargeMin;
                        const max = isSuction ? p.suctionMax : p.dischargeMax;
                        return v < min || v > max ? 'border-support-error' : '';
                      })()}`} type="number" placeholder={field.placeholder} value={diag[field.key] || ""} onChange={e => setD(field.key, e.target.value)} />
                    </FormItem>
                  ))}
                  <FormItem label="System status">
                    <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={diag.status || "optimal"} onChange={e => setD("status", e.target.value as SystemStatus)}>
                      <option value="optimal">Optimal</option>
                      <option value="sub-optimal">Sub-Optimal</option>
                      <option value="critical">Critical Failure</option>
                    </select>
                    {(() => {
                      const liveAlerts = runAlerts(diag);
                      const suggested = deriveSystemStatus(liveAlerts);
                      const current = diag.status || "optimal";
                      if (suggested === current) return null;
                      const labels: Record<SystemStatus, string> = { optimal: "Optimal", "sub-optimal": "Sub-Optimal", critical: "Critical Failure" };
                      const reason = liveAlerts.length > 0 ? liveAlerts.join(", ") + " detected" : "no alerts";
                      return (
                        <div className="mt-1 text-sm text-text-secondary flex items-center gap-2 flex-wrap">
                          <span>Suggested: <strong>{labels[suggested]}</strong> ({reason})</span>
                          <button type="button" className="inline-flex items-center px-2 py-1 text-[11px] bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setD("status", suggested)}>
                            Apply
                          </button>
                        </div>
                      );
                    })()}
                  </FormItem>
                </div>
                <FormItem label="Functional notes">
                  <textarea className="w-full h-20 px-3 py-2 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors resize-vertical" placeholder="Describe observations, parts used, repairs made..." value={diag.notes || ""} onChange={e => setD("notes", e.target.value)} />
                </FormItem>
              </div>

              <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors" onClick={runCheck}>Run Diagnostic Check</button>
            </div>
          )}

          {/* Media Tab */}
          {tab === "media" && (
            <div className="animate-fade-in">
              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <div className="flex justify-between gap-3 items-center flex-wrap mb-4">
                  <div>
                    <SectionTitle>Job Photos and Evidence</SectionTitle>
                    <p className="text-sm text-text-secondary m-0">Capture before, after, serial plate, and customer evidence while on site.</p>
                  </div>
                  {canEdit && (
                    <>
                      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e => handleUploadAttachment(e.target.files)} />
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors min-h-[44px]" onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachment}>
                        <Camera size={16} /> {uploadingAttachment ? 'Uploading...' : 'Add Photo'}
                      </button>
                    </>
                  )}
                </div>

                {attachmentError && <Notification kind="e" title="Attachment issue" body={attachmentError} />}

                {attachmentsLoading ? (
                  <p className="text-sm text-text-helper mb-4">Loading attachments...</p>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-text-helper mb-4">No uploaded evidence yet.</p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 mb-4">
                    {attachments.map(a => {
                      const href = a.dataUrl || a.url || undefined;
                      const isImage = a.contentType.startsWith('image/');
                      return (
                        <a key={a.id} href={href} target="_blank" rel="noreferrer" className="border border-border-subtle rounded overflow-hidden text-inherit no-underline bg-[#f5f5f5] min-h-[170px] flex flex-col">
                          <div className="aspect-[4/3] bg-surface-hover flex items-center justify-center">
                            {isImage && href ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={href} alt={a.fileName} className="w-full h-full object-cover" />
                            ) : (
                              <Camera size={28} />
                            )}
                          </div>
                          <div className="p-2 flex flex-col gap-1">
                            <span className="text-sm font-semibold break-words">{a.fileName}</span>
                            <span className="text-xs text-text-secondary">{a.uploader?.name || 'Uploaded'} · {new Date(a.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="border-t border-border-subtle pt-3">
                    <p className="text-sm text-text-secondary mb-2">Legacy photo references</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {photos.map((p, i) => (
                        <div key={i} className="min-w-[120px] min-h-[44px] bg-surface-hover border border-border-strong flex items-center gap-1.5 text-xs text-text-helper p-1">
                          <Camera size={14} />
                          <span className="break-words">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canEdit && (
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={handleAddPhoto} title="Add a legacy text photo reference">
                    <Plus size={14} /> Add Reference
                  </button>
                )}
              </div>
              
              <div className="bg-layer p-4 border border-border-subtle">
                <SectionTitle>Job Card Reference</SectionTitle>
                <FormItem label="Reference number" helper="e.g. JC-001-SIPHO or upload reference">
                  <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="Job card reference" value={jobCardRef} onChange={e => setJCR(e.target.value)} />
                </FormItem>
              </div>
            </div>
          )}

          {/* Sign-Off Tab */}
          {tab === "sign-off" && (
            <div className="animate-fade-in">
              {!canSign && (
                <Notification kind="w" title="Diagnostics required" body="Complete the Diagnostics tab before the customer sign-off becomes available." />
              )}
              
              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Job Status</SectionTitle>
                <FormItem label="Update status">
                  <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors max-w-[240px]" value={status} onChange={e => {
                    const next = e.target.value as JobStatus;
                    if (status === 'completed' && next !== 'completed') setPendingStatus(next);
                    else setStatus(next);
                  }}>
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </FormItem>
                {diag.status === "sub-optimal" && <Notification kind="w" title="Sub-optimal system status" body="A follow-up task will be created for admin review." />}
                {diag.status === "critical" && <Notification kind="e" title="Critical failure detected" body="Admin has been alerted. Do not close job until reviewed." />}
                {pendingStatus && (
                  <div className="flex items-start gap-3 p-4 mt-3 bg-amber-50 border-l-4 border-l-support-warning" role="alert">
                    <div>
                      <div className="font-semibold text-sm text-text-primary">Confirm status change</div>
                      <div className="text-sm text-text-secondary mt-1">
                        This job was marked completed. Changing to "{STATUS_CFG[pendingStatus]?.label}" will undo completion.
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="inline-flex items-center px-3 py-1.5 text-xs bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setPendingStatus(null)}>Cancel</button>
                        <button className="inline-flex items-center px-3 py-1.5 text-xs bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity" onClick={() => { setStatus(pendingStatus); setPendingStatus(null); }}>Confirm change</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {job.type !== "sales" && (
                <div className="bg-layer p-4 border border-border-subtle">
                  <SectionTitle>Customer Sign-Off</SectionTitle>
                  {sig ? (
                    <Notification kind="s" title="Customer has signed" body={`Signature captured at ${clockOut || nowTime()}.`} />
                  ) : canSign ? (
                    <SignaturePad onSave={s => setSig(s)} />
                  ) : (
                    <p className="text-sm text-text-helper">Complete diagnostics to unlock customer signature.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ODS Tab */}
          {tab === "ods" && (
            <div className="animate-fade-in">
              <div className="p-4 mb-4 border" style={{ background: '#00695c', borderColor: '#00897b' }}>
                <h3 className="text-white text-xl font-light mb-2">Ozone Depleting Substances (ODS) Tracking</h3>
                <p className="text-white/80 text-sm">Regulatory compliance tracking for refrigerant handling and recovery.</p>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Refrigerant Type</SectionTitle>
                {(() => {
                  const key = (diag.refrigerantType || '').trim();
                  const info = key ? REFRIGERANT_INFO[key] : undefined;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] mb-1">Current System Refrigerant</p>
                        <p className="text-2xl font-light" style={{ color: '#004d40' }}>{diag.refrigerantType || "Not specified"}</p>
                        {info && <p className="text-sm mt-1" style={{ color: '#00695c' }}>Family: <strong>{info.family}</strong></p>}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] mb-1">ODS Classification</p>
                        <p className="text-sm" style={{ color: '#004d40' }}>{info ? `${info.odsClass} (${info.family})` : 'Check classification'}</p>
                        {info && <p className="text-xs mt-1 leading-relaxed" style={{ color: '#00695c' }}>{info.notes}</p>}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] mb-1">GWP Rating</p>
                        <p className="text-sm" style={{ color: '#004d40' }}>{info ? `${info.gwp.toLocaleString()} (${info.gwpRating})` : 'Unknown'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Gas Usage inline form */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <SectionTitle>Log Gas Usage to Stock</SectionTitle>
                  {canEdit && (
                    <button className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-colors ${showGasLog ? 'bg-surface border border-border-strong text-text-primary' : 'bg-interactive text-white border-none'} hover:opacity-90`}
                      onClick={() => { setShowGasLog(g => !g); setGasError(null); setGasSuccess(null); }}>
                      {showGasLog ? 'Cancel' : <><Plus size={14} /> Log Usage</>}
                    </button>
                  )}
                </div>
                <p className="text-sm text-text-secondary mb-2">Records refrigerant used and deducts from your gas stock inventory.</p>

                {gasSuccess && (
                  <div className="flex items-start gap-3 p-4 mb-3 bg-green-50 border-l-4 border-l-support-success">
                    <div><div className="font-semibold text-sm text-text-primary">Logged</div><div className="text-sm text-text-secondary">{gasSuccess}</div></div>
                  </div>
                )}

                {gasMismatchWarning && (
                  <div className="flex items-start gap-3 p-4 mb-3 bg-amber-50 border-l-4 border-l-support-warning">
                    <div><div className="font-semibold text-sm text-text-primary">Refrigerant type mismatch</div><div className="text-sm text-text-secondary">{gasMismatchWarning}</div></div>
                  </div>
                )}

                {showGasLog && (() => {
                  const sortedStock = [...gasStock].sort((a, b) => { const aE = a.remaining <= 0 ? 1 : 0; const bE = b.remaining <= 0 ? 1 : 0; return aE - bE; });
                  const allDepleted = gasStock.length > 0 && gasStock.every(s => s.remaining <= 0);
                  const selectedStock = gasStock.find(s => s.id === gasForm.stockId);
                  const selectedDepleted = !!selectedStock && selectedStock.remaining <= 0;
                  return (
                    <div className="bg-layer p-4 border animate-fade-in" style={{ borderColor: 'var(--color-interactive)' }}>
                      {gasStockLoading && <p className="text-sm text-text-secondary">Loading stock…</p>}
                      {!gasStockLoading && gasStock.length === 0 && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border-l-4 border-l-support-warning">
                          <div><div className="font-semibold text-sm text-text-primary">No stock available</div><div className="text-sm text-text-secondary">No gas stock items exist in inventory. Contact admin to add stock.</div></div>
                        </div>
                      )}
                      {!gasStockLoading && allDepleted && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border-l-4 border-l-support-warning">
                          <div><div className="font-semibold text-sm text-text-primary">All stock depleted</div><div className="text-sm text-text-secondary">Every gas stock item is at zero. Contact admin to top up before logging usage.</div></div>
                        </div>
                      )}
                      {!gasStockLoading && gasStock.length > 0 && (
                        <div className="flex flex-col gap-3">
                          {gasError && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-l-support-error">
                              <div><div className="font-semibold text-sm text-text-primary">Notice</div><div className="text-sm text-text-secondary">{gasError}</div></div>
                            </div>
                          )}
                          <FormItem label="Gas Stock *">
                            <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={gasForm.stockId} onChange={e => setGasForm(f => ({ ...f, stockId: e.target.value }))}>
                              <option value="">Select gas…</option>
                              {sortedStock.map(s => (
                                <option key={s.id} value={s.id} disabled={s.remaining <= 0}>{s.gasType} — {s.brand} ({s.remaining} {s.unit} remaining){s.remaining <= 0 ? ' (empty)' : ''}</option>
                              ))}
                            </select>
                          </FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem label={`Quantity Used (${selectedStock?.unit || 'kg'}) *`}>
                              <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" step="0.1" min="0.1" max={selectedStock?.remaining} placeholder="e.g. 2.5" value={gasForm.quantityUsed} onChange={e => setGasForm(f => ({ ...f, quantityUsed: e.target.value }))} disabled={!gasForm.stockId || selectedDepleted} />
                            </FormItem>
                            <FormItem label="Purpose (optional)">
                              <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. System recharge" value={gasForm.purpose} onChange={e => setGasForm(f => ({ ...f, purpose: e.target.value }))} />
                            </FormItem>
                          </div>
                          <div className="flex justify-end">
                            <button className="inline-flex items-center px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={submitGasUsage} disabled={gasSubmitting || !gasForm.stockId || !gasForm.quantityUsed || selectedDepleted}>
                              {gasSubmitting ? 'Saving…' : 'Record Usage'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Refrigerant Movement Log</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { key: 'refrigerantRecovered' as const, label: 'Refrigerant Recovered (kg)', helper: 'Amount recovered from system' },
                    { key: 'refrigerantUsed' as const, label: 'Refrigerant Used (kg)', helper: 'New refrigerant added' },
                    { key: 'refrigerantReused' as const, label: 'Refrigerant Reused (kg)', helper: 'Recovered refrigerant recharged' },
                  ].map(f => (
                    <FormItem key={f.key} label={f.label} helper={f.helper}>
                      <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" step="0.1" placeholder="0.0" value={diag[f.key] || ""} onChange={e => setD(f.key, parseFloat(e.target.value) || 0)} />
                    </FormItem>
                  ))}
                </div>
              </div>

              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Summary</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{toNum(diag.refrigerantRecovered).toFixed(1)} kg</p>
                    <p className="text-xs text-text-secondary">Total Recovered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{toNum(diag.refrigerantUsed).toFixed(1)} kg</p>
                    <p className="text-xs text-text-secondary">Total Used</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: refrigerantNet >= 0 ? '#198038' : '#da1e28' }}>
                      {refrigerantNet >= 0 ? '+' : ''}{refrigerantNet.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-text-secondary">Net Change</p>
                  </div>
                </div>
              </div>

              <div className="bg-layer p-4 border border-border-subtle">
                <SectionTitle>Compliance Notes</SectionTitle>
                <p className="text-sm text-text-secondary leading-relaxed">
                  All refrigerant handling must comply with the Montreal Protocol and local environmental regulations.
                  Recovered refrigerant must be stored in certified recovery cylinders and properly labeled.
                  R-22 (HCFC) systems must be reported for phase-out tracking.
                </p>
              </div>
            </div>
          )}

          {/* Consumables Tab */}
          {tab === "consumables" && (
            <div className="animate-fade-in">
              <div className="bg-layer p-4 border border-border-subtle mb-4">
                <SectionTitle>Add Consumable</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <FormItem label="Type">
                    <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={newConsumable.type} onChange={e => setNewConsumable(p => ({ ...p, type: e.target.value as ConsumableType }))}>
                      {CONSUMABLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </FormItem>
                  <FormItem label="Name / Description">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. R-410A Gas, Compressor unit" value={newConsumable.name} onChange={e => setNewConsumable(p => ({ ...p, name: e.target.value }))} />
                  </FormItem>
                  <FormItem label="Brand">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="Optional" value={newConsumable.brand} onChange={e => setNewConsumable(p => ({ ...p, brand: e.target.value }))} />
                  </FormItem>
                  <FormItem label="Quantity">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="number" placeholder="0" value={newConsumable.quantity} onChange={e => setNewConsumable(p => ({ ...p, quantity: e.target.value }))} />
                  </FormItem>
                  <FormItem label="Unit">
                    <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={newConsumable.unit} onChange={e => setNewConsumable(p => ({ ...p, unit: e.target.value }))}>
                      {CONSUMABLE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </FormItem>
                  <FormItem label="Notes">
                    <input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="Optional notes" value={newConsumable.notes} onChange={e => setNewConsumable(p => ({ ...p, notes: e.target.value }))} />
                  </FormItem>
                </div>
                {canEdit && (
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors" onClick={handleAddConsumable}>
                    <Plus size={14} /> Add Consumable
                  </button>
                )}
              </div>

              <div className="bg-layer p-4 border border-border-subtle">
                <SectionTitle>Consumables Used on This Job</SectionTitle>
                {consumablesLoading ? (
                  <p className="text-sm text-text-secondary">Loading...</p>
                ) : consumables.length === 0 ? (
                  <p className="text-sm text-text-secondary">No consumables recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface-hover">
                          {['Type', 'Name', 'Brand', 'Qty', 'Unit', 'Notes', 'Recorded'].map(h => (
                            <th key={h} className="p-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] border-b border-border-subtle">{h}</th>
                          ))}
                          {canEdit && <th className="p-2" />}
                        </tr>
                      </thead>
                      <tbody>
                        {consumables.map(c => (
                          <tr key={c.id} className="border-b border-border-subtle">
                            <td className="p-2"><span className="inline-flex items-center h-6 px-2 text-[11px] font-semibold uppercase bg-surface-hover">{c.type}</span></td>
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 text-text-secondary">{c.brand || '—'}</td>
                            <td className="p-2 font-semibold">{c.quantity}</td>
                            <td className="p-2 text-text-secondary">{c.unit}</td>
                            <td className="p-2 text-text-secondary max-w-[160px]">{c.notes || '—'}</td>
                            <td className="p-2 text-text-secondary text-xs">{new Date(c.recordedAt).toLocaleDateString()}</td>
                            {canEdit && (
                              <td className="p-2">
                                <button className="inline-flex items-center px-2 py-1 text-[11px] bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleDeleteConsumable(c.id)}>
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-surface">
          <button className="inline-flex items-center px-4 py-2 text-sm bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={onClose}>Cancel</button>
          {canDeleteJobs(userRole) && onDelete && (
            <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity" onClick={() => { setDeleteReason(''); setDeleteError(null); setShowDeleteConfirm(true); }}>
              <Trash2 size={14} /> Delete Job
            </button>
          )}
          {onPrint && (
            <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={handlePrint}>
              <Download size={14} /> Download PDF
            </button>
          )}
          {canEdit && <button className="inline-flex items-center px-4 py-2 text-sm bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors" onClick={save}>Save Job Card</button>}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[9500] flex items-start justify-center overflow-y-auto p-4 sm:p-8 lg:p-12"
          onClick={e => e.target === e.currentTarget && !deleting && setShowDeleteConfirm(false)}>
          <div className="bg-layer w-full max-w-[480px] flex flex-col">
            <div className="flex items-start justify-between p-6 border-b border-border-subtle">
              <div><p className="text-xs text-text-secondary font-semibold uppercase tracking-[0.08em]">{job.id}</p><h2 className="text-xl font-semibold text-text-primary mt-1">Delete job?</h2></div>
              <button className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary p-1" onClick={() => !deleting && setShowDeleteConfirm(false)} aria-label="Close" disabled={deleting}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <p className="text-sm text-text-secondary m-0">
                This permanently removes <strong>{job.title}</strong> and all its related records
                (diagnostics, comments, history, consumables, gas usage). This cannot be undone.
              </p>
              <FormItem label="Reason for deletion *">
                <textarea className="w-full px-3 py-2 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors resize-vertical" rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="e.g. Duplicate entry, created in error, cancelled by customer…" disabled={deleting} />
              </FormItem>
              {deleteError && <Notification kind="e" title="Cannot delete" body={deleteError} />}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-surface">
              <button className="inline-flex items-center px-4 py-2 text-sm bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleConfirmDelete} disabled={deleting || !deleteReason.trim()}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
