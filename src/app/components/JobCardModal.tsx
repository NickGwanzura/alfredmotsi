'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ConsumableType
} from '@/app/types';
import { SEED_USERS } from '@/app/data/seed';
import { STATUS_CFG, TYPE_CFG, ALERT_CFG, REFRIGERANT_TYPES } from '@/app/lib/config';
import { fmtDate, nowTime, runAlerts, formatDuration, buildWA, buildMail, reminderMsg } from '@/app/lib/utils';
import { StatusTag, PrioTag, SectionTitle, Notification, FormItem, AlertTag } from './ui';
import SignaturePad from './SignaturePad';
import { captureAudit } from '@/app/lib/audit/capture';
import { Close, PlayFilled, StopFilled, Printer, Camera, Download, Add, TrashCan } from '@carbon/icons-react';

interface JobCardModalProps {
  job: Job;
  customers: Customer[];
  currentUser: User;
  onClose: () => void;
  onUpdate: (job: Job) => void;
  onPrint?: (job: Job) => void;
}

const TABS = ["details", "diagnostics", "media", "sign-off", "ods", "consumables"] as const;
type Tab = typeof TABS[number];

const CONSUMABLE_TYPES: ConsumableType[] = ['gas', 'compressor', 'part', 'other'];
const CONSUMABLE_UNITS = ['kg', 'unit', 'pcs', 'L', 'set', 'm'];

const UNIT_TYPE_OPTIONS: UnitType[] = [
  "Split System", 
  "Ducted", 
  "Package Unit", 
  "Multi-Head", 
  "Cassette", 
  "VRV/VRF", 
  "Refrigeration System", 
  "Chiller", 
  "Heat Pump", 
  "Precision Cooling"
];

const REFRIGERANT_OPTIONS: (RefrigerantType | string)[] = REFRIGERANT_TYPES;

export default function JobCardModal({ job, customers, currentUser, onClose, onUpdate, onPrint }: JobCardModalProps) {
  const cust = useMemo(() => customers.find(c => c.id === job.customerId), [customers, job.customerId]) || {} as Customer;
  const isAdmin = currentUser.role === "admin";
  const isAssigned = job.techIds.includes(currentUser.id);
  const canEdit = isAdmin || isAssigned;

  const [tab, setTab] = useState<Tab>("details");
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>(job.comments || []);
  const [jobCardRef, setJCR] = useState(job.jobCardRef || "");
  const [sig, setSig] = useState<string | null>(job.signature);
  const [photos, setPhotos] = useState<string[]>(job.photos || []);
  const [clockIn, setCIn] = useState<string | null>(job.clockIn);
  const [clockOut, setCOut] = useState<string | null>(job.clockOut);

  const blankDiag: Diagnostics = { 
    voltage: "", 
    current: "", 
    avgTemp: "", 
    maxTemp: "", 
    suction: "", 
    discharge: "", 
    refrigerantType: "R-410A", 
    refrigerantRecovered: 0,
    refrigerantUsed: 0,
    refrigerantReused: 0,
    status: "optimal", 
    notes: "", 
    deltaT: "", 
    brand: "", 
    serial: "", 
    unitType: undefined 
  };
  
  const [diag, setDiag] = useState<Diagnostics>(job.diagnostics || blankDiag);
  const [alerts, setAlerts] = useState<AlertType[]>(job.alerts || []);

  // Consumables
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [newConsumable, setNewConsumable] = useState({ type: 'part' as ConsumableType, name: '', brand: '', quantity: '', unit: 'unit', notes: '' });

  // ODS quick gas log modal state
  const [showGasLog, setShowGasLog] = useState(false);

  // Audit: fire-and-forget on mount
  useEffect(() => {
    captureAudit('view_job', job.id);
  }, [job.id]);

  // Load consumables when tab is opened
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

  const setD = (k: keyof Diagnostics, v: string | number | undefined) =>
    setDiag(prev => ({ ...prev, [k]: v }));

  const runCheck = () => {
    const a = runAlerts(diag);
    setAlerts(a);
    return a;
  };

  const diagDone = !!(diag.voltage && diag.current && diag.suction && diag.discharge);
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
    onUpdate({
      ...job,
      status,
      clockIn,
      clockOut: co,
      diagnostics: diag.voltage ? diag : job.diagnostics,
      alerts: a,
      signature: sig,
      photos,
      jobCardRef,
      comments
    });
    onClose();
  };

  const handleClockIn = () => {
    setCIn(nowTime());
    setStatus("on-site");
  };

  const handleClockOut = () => {
    setCOut(nowTime());
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    setComments(p => [...p, { author: currentUser.name, text: comment, time: nowTime() }]);
    setComment("");
  };

  const handleAddPhoto = () => {
    setPhotos(p => [...p, `photo_${Date.now()}.jpg`]);
  };

  const handleWhatsAppReminder = () => {
    const msg = reminderMsg(job, cust, false);
    const url = buildWA(cust.whatsapp || cust.phone, msg);
    window.open(url, '_blank');
  };

  const handleEmailReminder = () => {
    const subject = `Service Reminder: ${job.title}`;
    const body = reminderMsg(job, cust, false);
    const url = buildMail(cust.email, subject, body);
    window.location.href = url;
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint(job);
    } else {
      window.print();
    }
  };

  // Calculate refrigerant totals for ODS tab
  const refrigerantNet = (diag.refrigerantUsed || 0) - (diag.refrigerantRecovered || 0);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hdr">
          <div>
            <p className="modal-lbl">{job.id} — {t.label}</p>
            <h2 className="modal-title">{job.title}</h2>
            <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s3)", flexWrap: "wrap" }}>
              <StatusTag status={status} />
              <PrioTag p={job.priority} />
              {alerts.map(a => <AlertTag key={a} alert={a} />)}
              {job.recurring && (
                <span className="tag" style={{ background: "var(--tp2)", color: "var(--tpt)" }}>
                  ↻ Recurring
                </span>
              )}
            </div>
          </div>
          <button 
            className="x-btn" 
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
          >
            <Close size={20} />
          </button>
        </div>

        {/* Time Tracking Bar */}
        {canEdit && job.type !== "sales" && (
          <div style={{ 
            background: "var(--l2)", 
            borderBottom: "1px solid var(--bs1)", 
            padding: "var(--s3) var(--s7)", 
            display: "flex", 
            alignItems: "center", 
            gap: "var(--s6)", 
            flexWrap: "wrap" 
          }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>Time Tracking</span>
            {!clockIn ? (
              <button 
                className="btn btn-ok btn-sm" 
                onClick={handleClockIn}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <PlayFilled size={14} />
                Clock In
              </button>
            ) : (
              <span className="mono" style={{ color: "var(--ss)" }}>IN {clockIn}</span>
            )}
            {clockIn && !clockOut ? (
              <button 
                className="btn btn-d btn-sm" 
                onClick={handleClockOut}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <StopFilled size={14} />
                Clock Out
              </button>
            ) : clockOut && (
              <span className="mono" style={{ color: "var(--se)" }}>OUT {clockOut}</span>
            )}
            {dur && <span className="mono" style={{ color: "var(--ts)" }}>Duration: {dur}</span>}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(tName => (
            <div 
              key={tName} 
              className={`tab ${tab === tName ? "on" : ""}`} 
              onClick={() => setTab(tName)}
            >
              {tName === "sign-off" ? "Sign-Off" :
               tName === "ods" ? "ODS" :
               tName === "consumables" ? "Consumables" :
               tName.charAt(0).toUpperCase() + tName.slice(1)}
            </div>
          ))}
        </div>

        <div className="modal-body">
          {/* Details Tab */}
          {tab === "details" && (
            <div className="fi-anim">
              <div className="g2" style={{ marginBottom: "var(--s5)" }}>
                <div className="tile">
                  <SectionTitle>Customer</SectionTitle>
                  <p style={{ fontWeight: 600, marginBottom: "var(--s2)" }}>{cust.name}</p>
                  <p style={{ fontSize: "14px", color: "var(--ts)" }}>{cust.phone}</p>
                  <p style={{ fontSize: "14px", color: "var(--ts)" }}>{cust.email}</p>
                </div>
                <div className="tile">
                  <SectionTitle>Scheduled</SectionTitle>
                  <p style={{ fontWeight: 600, marginBottom: "var(--s2)" }}>{fmtDate(job.date)} at {job.time}</p>
                  <p style={{ fontSize: "14px", color: "var(--ts)" }}>Unit type: {job.unitType}</p>
                </div>
              </div>
              
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Site Address</SectionTitle>
                <p style={{ marginBottom: "var(--s2)" }}>{cust.address}</p>
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(cust.address || "")}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ 
                    fontSize: "14px", 
                    color: "var(--bi)", 
                    textDecoration: "none", 
                    fontWeight: 500 
                  }}
                >
                  Open in Google Maps →
                </a>
              </div>

              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Scope of Work</SectionTitle>
                <p style={{ color: "var(--ts)", lineHeight: 1.6 }}>{job.description}</p>
              </div>

              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Team</SectionTitle>
                <p style={{ marginBottom: "var(--s1)" }}>Lead technician: <strong>{techName}</strong></p>
                {coName && <p style={{ color: "var(--ts)" }}>Assisting: <strong style={{ color: "var(--tp)" }}>{coName}</strong></p>}
              </div>

              {(job.history || []).length > 0 && (
                <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                  <SectionTitle>Site Service History</SectionTitle>
                  <div className="sl">
                    {job.history.map((h, i) => (
                      <div key={i} className="sl-row">
                        <span className="sl-col sl-sm mono" style={{ color: "var(--ts)" }}>{h.date}</span>
                        <span className="sl-col">{h.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Communication Buttons */}
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Customer Communication</SectionTitle>
                <div style={{ display: "flex", gap: "var(--s3)", flexWrap: "wrap" }}>
                  <button className="btn btn-wa btn-sm" onClick={handleWhatsAppReminder}>
                    WhatsApp Reminder
                  </button>
                  <button className="btn btn-mail btn-sm" onClick={handleEmailReminder}>
                    Email Reminder
                  </button>
                  {onPrint && (
                    <button className="btn btn-s btn-sm" onClick={handlePrint}>
                      Print Job Card
                    </button>
                  )}
                </div>
              </div>

              <div className="tile">
                <SectionTitle>Comments ({comments.length})</SectionTitle>
                {comments.map((c, i) => (
                  <div key={i} style={{ padding: "var(--s4) 0", borderBottom: "1px solid var(--bs1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--s1)" }}>
                      <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--bi)" }}>{c.author}</span>
                      <span className="mono" style={{ fontSize: "12px", color: "var(--th)" }}>{c.time}</span>
                    </div>
                    <p style={{ color: "var(--ts)", fontSize: "14px" }}>{c.text}</p>
                  </div>
                ))}
                {canEdit && (
                  <div style={{ marginTop: "var(--s5)" }}>
                    <FormItem label="Add comment">
                      <textarea 
                        className="ta" 
                        placeholder="Describe progress, observations, or issues..." 
                        value={comment} 
                        onChange={e => setComment(e.target.value)} 
                      />
                    </FormItem>
                    <button 
                      className="btn btn-g btn-sm" 
                      onClick={handleAddComment}
                    >
                      Post Comment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnostics Tab */}
          {tab === "diagnostics" && (
            <div className="fi-anim">
              {alerts.map(a => (
                <Notification 
                  key={a} 
                  kind="e" 
                  title={`${ALERT_CFG[a]?.icon} ${ALERT_CFG[a]?.label}`} 
                  body="This reading exceeds safe operating thresholds. Admin has been notified." 
                />
              ))}

              {/* Equipment Identification */}
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>1 — Equipment Identification</SectionTitle>
                <div className="g3">
                  <FormItem label="Machine type">
                    <select 
                      className="sel" 
                      value={diag.unitType || ""} 
                      onChange={e => setD("unitType", e.target.value as UnitType)}
                    >
                      <option value="">Select</option>
                      {UNIT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormItem>
                  <FormItem label="Brand / Model">
                    <input 
                      className="inp" 
                      placeholder="e.g. Samsung AR18" 
                      value={diag.brand || ""} 
                      onChange={e => setD("brand", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem label="Serial number" helper="Enter manually or scan barcode">
                    <div style={{ display: "flex" }}>
                      <input 
                        className="inp" 
                        placeholder="Serial number" 
                        value={diag.serial || ""} 
                        onChange={e => setD("serial", e.target.value)} 
                        style={{ flex: 1 }} 
                      />
                      <button 
                        className="btn btn-s btn-sm" 
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="Scan barcode"
                        title="Scan"
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                  </FormItem>
                </div>
              </div>

              {/* Electrical Readings */}
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>2 — Electrical Readings</SectionTitle>
                <div className="g3">
                  <FormItem 
                    label="Supply voltage (V)" 
                    error={diag.voltage && parseFloat(diag.voltage) < 210 ? "Below 210 V minimum — LOW_VOLTAGE alert" : undefined}
                  >
                    <input 
                      className={`inp ${diag.voltage && parseFloat(diag.voltage) < 210 ? "inp-err" : ""}`} 
                      type="number" 
                      placeholder="e.g. 230" 
                      value={diag.voltage || ""} 
                      onChange={e => setD("voltage", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem 
                    label="Current draw (A)" 
                    error={diag.current && parseFloat(diag.current) > 16 ? "Exceeds 16 A max — HIGH_CURRENT alert" : undefined}
                  >
                    <input 
                      className={`inp ${diag.current && parseFloat(diag.current) > 16 ? "inp-err" : ""}`} 
                      type="number" 
                      placeholder="e.g. 12.5" 
                      value={diag.current || ""} 
                      onChange={e => setD("current", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem label="Refrigerant type">
                    <select 
                      className="sel" 
                      value={diag.refrigerantType || "R-410A"} 
                      onChange={e => setD("refrigerantType", e.target.value)}
                    >
                      {REFRIGERANT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormItem>
                </div>
              </div>

              {/* Thermal Readings */}
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>3 — Thermal Readings</SectionTitle>
                <div className="g3">
                  <FormItem label="Avg operating temp (°C)">
                    <input 
                      className="inp" 
                      type="number" 
                      placeholder="e.g. 22" 
                      value={diag.avgTemp || ""} 
                      onChange={e => setD("avgTemp", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem label="Max design temp (°C)">
                    <input 
                      className="inp" 
                      type="number" 
                      placeholder="e.g. 40" 
                      value={diag.maxTemp || ""} 
                      onChange={e => setD("maxTemp", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem label="Delta T — return vs supply (°C)" helper="Measures cooling efficiency">
                    <input 
                      className="inp" 
                      type="number" 
                      placeholder="e.g. 11" 
                      value={diag.deltaT || ""} 
                      onChange={e => setD("deltaT", e.target.value)} 
                    />
                  </FormItem>
                </div>
              </div>

              {/* Refrigeration Pressure Test */}
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>4 — Refrigeration Pressure Test</SectionTitle>
                <div className="g3">
                  <FormItem 
                    label="Suction pressure (PSI)" 
                    error={diag.suction && parseFloat(diag.suction) < 50 ? "Low suction — possible refrigerant leak" : undefined}
                  >
                    <input 
                      className={`inp ${diag.suction && parseFloat(diag.suction) < 50 ? "inp-err" : ""}`} 
                      type="number" 
                      placeholder="e.g. 68" 
                      value={diag.suction || ""} 
                      onChange={e => setD("suction", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem 
                    label="Discharge pressure (PSI)" 
                    error={diag.discharge && parseFloat(diag.discharge) > 300 ? "High discharge — possible blockage" : undefined}
                  >
                    <input 
                      className={`inp ${diag.discharge && parseFloat(diag.discharge) > 300 ? "inp-err" : ""}`} 
                      type="number" 
                      placeholder="e.g. 245" 
                      value={diag.discharge || ""} 
                      onChange={e => setD("discharge", e.target.value)} 
                    />
                  </FormItem>
                  <FormItem label="System status">
                    <select 
                      className="sel" 
                      value={diag.status || "optimal"} 
                      onChange={e => setD("status", e.target.value as SystemStatus)}
                    >
                      <option value="optimal">Optimal</option>
                      <option value="sub-optimal">Sub-Optimal</option>
                      <option value="critical">Critical Failure</option>
                    </select>
                  </FormItem>
                </div>
                <FormItem label="Functional notes">
                  <textarea 
                    className="ta" 
                    placeholder="Describe observations, parts used, repairs made..." 
                    value={diag.notes || ""} 
                    onChange={e => setD("notes", e.target.value)} 
                  />
                </FormItem>
              </div>

              <button className="btn btn-p" onClick={runCheck}>Run Diagnostic Check</button>
            </div>
          )}

          {/* Media Tab */}
          {tab === "media" && (
            <div className="fi-anim">
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Before and After Photos</SectionTitle>
                {photos.length === 0 && (
                  <p style={{ color: "var(--th)", fontSize: "14px", marginBottom: "var(--s4)" }}>
                    No photos attached yet.
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s3)", marginBottom: "var(--s4)" }}>
                  {photos.map((p, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        width: 80, 
                        height: 80, 
                        background: "var(--l2)", 
                        border: "1px solid var(--bg1)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        fontSize: "12px", 
                        color: "var(--th)", 
                        textAlign: "center", 
                        padding: 4 
                      }}
                    >
                      📷 {p}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <button className="btn btn-s btn-sm" onClick={handleAddPhoto}>
                    + Attach Photo
                  </button>
                )}
              </div>
              
              <div className="tile">
                <SectionTitle>Job Card Reference</SectionTitle>
                <FormItem label="Reference number" helper="e.g. JC-001-SIPHO or upload reference">
                  <input 
                    className="inp" 
                    placeholder="Job card reference" 
                    value={jobCardRef} 
                    onChange={e => setJCR(e.target.value)} 
                  />
                </FormItem>
              </div>
            </div>
          )}

          {/* Sign-Off Tab */}
          {tab === "sign-off" && (
            <div className="fi-anim">
              {!canSign && (
                <Notification 
                  kind="w" 
                  title="Diagnostics required" 
                  body="Complete the Diagnostics tab before the customer sign-off becomes available." 
                />
              )}
              
              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Job Status</SectionTitle>
                <FormItem label="Update status">
                  <select 
                    className="sel" 
                    value={status} 
                    onChange={e => setStatus(e.target.value as JobStatus)} 
                    style={{ maxWidth: 240 }}
                  >
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </FormItem>
                {diag.status === "sub-optimal" && (
                  <Notification kind="w" title="Sub-optimal system status" body="A follow-up task will be created for admin review." />
                )}
                {diag.status === "critical" && (
                  <Notification kind="e" title="Critical failure detected" body="Admin has been alerted. Do not close job until reviewed." />
                )}
              </div>

              {job.type !== "sales" && (
                <div className="tile">
                  <SectionTitle>Customer Sign-Off</SectionTitle>
                  {sig ? (
                    <Notification kind="s" title="Customer has signed" body={`Signature captured at ${clockOut || nowTime()}.`} />
                  ) : canSign ? (
                    <SignaturePad onSave={s => setSig(s)} />
                  ) : (
                    <p style={{ color: "var(--th)", fontSize: "14px" }}>
                      Complete diagnostics to unlock customer signature.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ODS Tab */}
          {tab === "ods" && (
            <div className="fi-anim">
              <div className="tile" style={{ marginBottom: "var(--s5)", background: "linear-gradient(135deg, #004d40, #00695c)", borderColor: "#00897b" }}>
                <h3 style={{ color: "#fff", fontSize: "20px", fontWeight: 300, marginBottom: "var(--s3)" }}>
                  Ozone Depleting Substances (ODS) Tracking
                </h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                  Regulatory compliance tracking for refrigerant handling and recovery.
                </p>
              </div>

              <div className="refrig-box">
                <SectionTitle>Refrigerant Type</SectionTitle>
                <div className="g3" style={{ marginBottom: "var(--s5)" }}>
                  <div>
                    <p className="lbl">Current System Refrigerant</p>
                    <p style={{ fontSize: "24px", fontWeight: 300, color: "#004d40" }}>
                      {diag.refrigerantType || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="lbl">ODS Classification</p>
                    <p style={{ fontSize: "14px", color: "#004d40" }}>
                      {diag.refrigerantType?.startsWith('R-22') ? 'Class I ODS (HCFC) - Phase-out in progress' : 
                       diag.refrigerantType?.startsWith('R-4') || diag.refrigerantType?.startsWith('R-32') ? 'Non-ODS (HFC) - Subject to F-gas regulations' : 
                       'Check classification'}
                    </p>
                  </div>
                  <div>
                    <p className="lbl">GWP Rating</p>
                    <p style={{ fontSize: "14px", color: "#004d40" }}>
                      {diag.refrigerantType === 'R-22' ? '1,810 (High)' :
                       diag.refrigerantType === 'R-410A' ? '2,088 (High)' :
                       diag.refrigerantType === 'R-32' ? '675 (Medium)' :
                       diag.refrigerantType === 'R-134a' ? '1,430 (High)' :
                       diag.refrigerantType === 'R-407C' ? '1,774 (High)' :
                       'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Gas Log Button */}
              <div style={{ marginBottom: "var(--s5)", display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-p btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowGasLog(true)}
                >
                  <Add size={14} />
                  Log Gas Usage to Stock
                </button>
              </div>

              {/* Quick Gas Log inline form */}
              {showGasLog && (
                <div className="tile" style={{ marginBottom: 'var(--s5)', border: '2px solid var(--cds-interactive)' }}>
                  <SectionTitle>Log Gas Usage</SectionTitle>
                  <p style={{ fontSize: 13, color: 'var(--cds-text-secondary)', marginBottom: 'var(--s4)' }}>
                    Record gas used on this job — this will deduct from your stock inventory.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--cds-text-secondary)' }}>
                    Use the Gas Usage page to record full details, or add this job's gas under the Consumables tab.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
                    <button className="btn btn-s btn-sm" onClick={() => { setShowGasLog(false); setTab('consumables'); }}>
                      Go to Consumables tab
                    </button>
                    <button className="btn btn-g btn-sm" onClick={() => setShowGasLog(false)}>Dismiss</button>
                  </div>
                </div>
              )}

              <div className="refrig-box">
                <SectionTitle>Refrigerant Movement Log</SectionTitle>
                <div className="g3" style={{ marginBottom: "var(--s5)" }}>
                  <FormItem label="Refrigerant Recovered (kg)" helper="Amount recovered from system">
                    <input 
                      className="inp" 
                      type="number" 
                      step="0.1"
                      placeholder="0.0" 
                      value={diag.refrigerantRecovered || ""} 
                      onChange={e => setD("refrigerantRecovered", parseFloat(e.target.value) || 0)} 
                    />
                  </FormItem>
                  <FormItem label="Refrigerant Used (kg)" helper="New refrigerant added">
                    <input 
                      className="inp" 
                      type="number" 
                      step="0.1"
                      placeholder="0.0" 
                      value={diag.refrigerantUsed || ""} 
                      onChange={e => setD("refrigerantUsed", parseFloat(e.target.value) || 0)} 
                    />
                  </FormItem>
                  <FormItem label="Refrigerant Reused (kg)" helper="Recovered refrigerant recharged">
                    <input 
                      className="inp" 
                      type="number" 
                      step="0.1"
                      placeholder="0.0" 
                      value={diag.refrigerantReused || ""} 
                      onChange={e => setD("refrigerantReused", parseFloat(e.target.value) || 0)} 
                    />
                  </FormItem>
                </div>
              </div>

              <div className="tile" style={{ marginBottom: "var(--s5)" }}>
                <SectionTitle>Summary</SectionTitle>
                <div className="g3">
                  <div className="ods-stat">
                    <p className="ods-stat-v">{diag.refrigerantRecovered?.toFixed(1) || "0.0"} kg</p>
                    <p className="ods-stat-l">Total Recovered</p>
                  </div>
                  <div className="ods-stat">
                    <p className="ods-stat-v">{diag.refrigerantUsed?.toFixed(1) || "0.0"} kg</p>
                    <p className="ods-stat-l">Total Used</p>
                  </div>
                  <div className="ods-stat">
                    <p className="ods-stat-v" style={{ color: refrigerantNet >= 0 ? '#198038' : '#da1e28' }}>
                      {refrigerantNet >= 0 ? '+' : ''}{refrigerantNet.toFixed(1)} kg
                    </p>
                    <p className="ods-stat-l">Net Change</p>
                  </div>
                </div>
              </div>

              <div className="tile">
                <SectionTitle>Compliance Notes</SectionTitle>
                <p style={{ fontSize: "14px", color: "var(--ts)", lineHeight: 1.6 }}>
                  All refrigerant handling must comply with the Montreal Protocol and local environmental regulations. 
                  Recovered refrigerant must be stored in certified recovery cylinders and properly labeled. 
                  R-22 (HCFC) systems must be reported for phase-out tracking.
                </p>
              </div>
            </div>
          )}
        </div>

          {/* Consumables Tab */}
          {tab === "consumables" && (
            <div className="fi-anim">
              <div className="tile" style={{ marginBottom: 'var(--s5)' }}>
                <SectionTitle>Add Consumable</SectionTitle>
                <div className="g3" style={{ marginBottom: 'var(--s4)' }}>
                  <FormItem label="Type">
                    <select className="sel" value={newConsumable.type} onChange={e => setNewConsumable(p => ({ ...p, type: e.target.value as ConsumableType }))}>
                      {CONSUMABLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </FormItem>
                  <FormItem label="Name / Description">
                    <input className="inp" placeholder="e.g. R-410A Gas, Compressor unit" value={newConsumable.name} onChange={e => setNewConsumable(p => ({ ...p, name: e.target.value }))} />
                  </FormItem>
                  <FormItem label="Brand">
                    <input className="inp" placeholder="Optional" value={newConsumable.brand} onChange={e => setNewConsumable(p => ({ ...p, brand: e.target.value }))} />
                  </FormItem>
                  <FormItem label="Quantity">
                    <input className="inp" type="number" placeholder="0" value={newConsumable.quantity} onChange={e => setNewConsumable(p => ({ ...p, quantity: e.target.value }))} />
                  </FormItem>
                  <FormItem label="Unit">
                    <select className="sel" value={newConsumable.unit} onChange={e => setNewConsumable(p => ({ ...p, unit: e.target.value }))}>
                      {CONSUMABLE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </FormItem>
                  <FormItem label="Notes">
                    <input className="inp" placeholder="Optional notes" value={newConsumable.notes} onChange={e => setNewConsumable(p => ({ ...p, notes: e.target.value }))} />
                  </FormItem>
                </div>
                {canEdit && (
                  <button className="btn btn-p btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleAddConsumable}>
                    <Add size={14} />
                    Add Consumable
                  </button>
                )}
              </div>

              <div className="tile">
                <SectionTitle>Consumables Used on This Job</SectionTitle>
                {consumablesLoading ? (
                  <p style={{ color: 'var(--cds-text-secondary)', fontSize: 14 }}>Loading...</p>
                ) : consumables.length === 0 ? (
                  <p style={{ color: 'var(--cds-text-secondary)', fontSize: 14 }}>No consumables recorded yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--cds-layer-02)' }}>
                          {['Type', 'Name', 'Brand', 'Qty', 'Unit', 'Notes', 'Recorded'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--cds-border-subtle)', fontWeight: 600, fontSize: 12, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                          ))}
                          {canEdit && <th />}
                        </tr>
                      </thead>
                      <tbody>
                        {consumables.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--cds-border-subtle)' }}>
                            <td style={{ padding: '8px 12px' }}><span style={{ background: 'var(--cds-layer-02)', padding: '2px 8px', borderRadius: 2, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{c.type}</span></td>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{c.name}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--cds-text-secondary)' }}>{c.brand || '—'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.quantity}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--cds-text-secondary)' }}>{c.unit}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--cds-text-secondary)', maxWidth: 160 }}>{c.notes || '—'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--cds-text-secondary)', fontSize: 11 }}>{new Date(c.recordedAt).toLocaleDateString()}</td>
                            {canEdit && (
                              <td style={{ padding: '8px 12px' }}>
                                <button className="btn btn-d btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDeleteConsumable(c.id)}>
                                  <TrashCan size={12} />
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

        <div className="modal-foot">
          <button className="btn btn-g" onClick={onClose}>Cancel</button>
          {status === "completed" && onPrint && (
            <button className="btn btn-s" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={handlePrint}>
              <Download size={14} />
              Download PDF
            </button>
          )}
          {canEdit && <button className="btn btn-p" onClick={save}>Save Job Card</button>}
        </div>
      </div>
    </div>
  );
}
