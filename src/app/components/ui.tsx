'use client';

import React from 'react';
import { JobStatus, JobPriority, AlertType, CRMOutcome } from '@/app/types';
import { STATUS_CFG, PRIO_TAG, ALERT_CFG } from '@/app/lib/config';
import { Icon } from './Icon';

export function StatusTag({ status }: { status: JobStatus }) {
  const c = STATUS_CFG[status] || { label: status, bg: "var(--tgr)", txt: "var(--tgrt)" };
  return <span className="tag" style={{ background: c.bg, color: c.txt }}>{c.label}</span>;
}

export function PrioTag({ p }: { p: JobPriority }) {
  const c = PRIO_TAG[p] || PRIO_TAG.low;
  return <span className="tag" style={{ background: c.bg, color: c.txt }}>{p.toUpperCase()}</span>;
}

export function Avatar({ name, size = 32, color = "#0f62fe" }: { name: string; size?: number; color?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("");
  return (
    <div style={{ 
      width: size, 
      height: size, 
      background: color, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      fontWeight: 600, 
      fontSize: size * 0.34, 
      fontFamily: "IBM Plex Sans, sans-serif", 
      color: "#fff", 
      flexShrink: 0 
    }}>
      {initials}
    </div>
  );
}

export function SectionTitle({ children, color }: { children: React.ReactNode; color?: string }) {
  return <p className="sec-title" style={color ? { color } : {}}>{children}</p>;
}

const notificationIcons: Record<string, string> = {
  e: 'error',
  w: 'warning', 
  s: 'checkmark',
  i: 'info',
};

const notificationRoles: Record<string, string> = {
  e: 'alert',
  w: 'alert',
  s: 'status',
  i: 'status',
};

export function Notification({ 
  kind = "i", 
  title, 
  body 
}: { 
  kind?: "e" | "w" | "s" | "i"; 
  title: string; 
  body?: string 
}) {
  const cls = { e: "notif-e", w: "notif-w", s: "notif-s", i: "notif-i" }[kind] || "notif-i";
  const iconName = notificationIcons[kind];
  const role = notificationRoles[kind];
  
  return (
    <div 
      className={`notif ${cls}`}
      role={role}
      aria-live={kind === 'e' ? 'assertive' : 'polite'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}>
          <Icon name={iconName as any} size={20} />
        </span>
        <div>
          <div className="notif-title">{title}</div>
          {body && <div className="notif-body">{body}</div>}
        </div>
      </div>
    </div>
  );
}

export function FormItem({ 
  label, 
  helper, 
  error, 
  children 
}: { 
  label?: string; 
  helper?: string; 
  error?: string | null; 
  children: React.ReactNode 
}) {
  return (
    <div className="fi">
      {label && <label className="lbl">{label}</label>}
      {children}
      {helper && !error && <p className="helper">{helper}</p>}
      {error && <p className="err-txt">{error}</p>}
    </div>
  );
}

export function AlertTag({ alert }: { alert: AlertType }) {
  const config = ALERT_CFG[alert];
  return (
    <span 
      className="tag" 
      style={{ 
        background: "var(--seb)", 
        color: "var(--se)" 
      }}
    >
      {config?.icon} {config?.label}
    </span>
  );
}

export function CRMOutcomeTag({ outcome }: { outcome: CRMOutcome }) {
  const configs: Record<CRMOutcome, { bg: string; txt: string; label: string }> = {
    positive: { bg: "#d4edda", txt: "#155724", label: "Positive" },
    negative: { bg: "#f8d7da", txt: "#842029", label: "Negative" },
    pending: { bg: "#fff3cd", txt: "#664d03", label: "Pending" },
    resolved: { bg: "#d1ecf1", txt: "#0c5460", label: "Resolved" },
  };
  const c = configs[outcome];
  return <span className="tag" style={{ background: c.bg, color: c.txt }}>{c.label}</span>;
}
