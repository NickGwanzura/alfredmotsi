'use client';

import React from 'react';
import { JobStatus, JobPriority, AlertType, CRMOutcome } from '@/app/types';
import { STATUS_CFG, PRIO_TAG, ALERT_CFG } from '@/app/lib/config';
import { Icon } from './Icon';

type NotifKind = 'e' | 'w' | 's' | 'i';

const notifStyles: Record<NotifKind, string> = {
  e: 'bg-red-50 border-l-4 border-l-support-error text-red-800',
  w: 'bg-amber-50 border-l-4 border-l-support-warning text-amber-800',
  s: 'bg-green-50 border-l-4 border-l-support-success text-green-800',
  i: 'bg-blue-50 border-l-4 border-l-support-info text-blue-800',
};

const notifIcons: Record<NotifKind, string> = {
  e: 'error',
  w: 'warning',
  s: 'checkmark',
  i: 'info',
};

const notifRoles: Record<NotifKind, string> = {
  e: 'alert',
  w: 'alert',
  s: 'status',
  i: 'status',
};

export function StatusTag({ status }: { status: JobStatus }) {
  const c = STATUS_CFG[status] || { label: status, bg: '#e0e0e0', txt: '#161616' };
  return (
    <span
      className="inline-flex items-center h-6 px-2 text-[11px] font-normal tracking-[0.32px] whitespace-nowrap rounded-full"
      style={{ background: c.bg, color: c.txt }}
    >
      {c.label}
    </span>
  );
}

export function PrioTag({ p }: { p: JobPriority }) {
  const c = PRIO_TAG[p] || PRIO_TAG.low;
  return (
    <span
      className="inline-flex items-center h-6 px-2 text-[11px] font-normal tracking-[0.32px] whitespace-nowrap rounded-full"
      style={{ background: c.bg, color: c.txt }}
    >
      {p.toUpperCase()}
    </span>
  );
}

export function Avatar({ name, size = 32, color = '#00695c' }: { name: string; size?: number; color?: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('');
  return (
    <div
      className="flex items-center justify-center font-semibold shrink-0 font-sans text-white rounded-full"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

export function SectionTitle({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      className="text-[11px] font-semibold text-text-primary uppercase tracking-[0.08em] mb-4"
      style={color ? { color } : {}}
    >
      {children}
    </p>
  );
}

export function Notification({
  kind = 'i',
  title,
  body,
}: {
  kind?: NotifKind;
  title: string;
  body?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 mb-4 ${notifStyles[kind]}`}
      role={notifRoles[kind]}
      aria-live={kind === 'e' ? 'assertive' : 'polite'}
    >
      <span className="shrink-0 mt-0.5">
        <Icon name={notifIcons[kind] as any} size={20} />
      </span>
      <div>
        <p className="font-semibold text-sm text-text-primary">{title}</p>
        {body && <p className="text-sm text-text-secondary mt-0.5">{body}</p>}
      </div>
    </div>
  );
}

export function FormItem({
  label,
  helper,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  helper?: string;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {label && (
        <label className="block text-xs font-normal text-text-secondary mb-1 tracking-[0.32px]" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {helper && !error && <p className="text-xs text-text-helper mt-1">{helper}</p>}
      {error && <p className="text-xs text-support-error mt-1">{error}</p>}
    </div>
  );
}

export function AlertTag({ alert }: { alert: AlertType }) {
  return (
    <span className="inline-flex items-center h-6 px-2 text-[11px] whitespace-nowrap bg-red-50 text-support-error rounded-full">
      {ALERT_CFG[alert]?.label || alert}
    </span>
  );
}

const outcomeStyles: Record<CRMOutcome, string> = {
  positive: 'bg-green-50 text-support-success',
  negative: 'bg-red-50 text-support-error',
  pending: 'bg-amber-50 text-[#b28600]',
  resolved: 'bg-blue-50 text-support-info',
};

const outcomeLabels: Record<CRMOutcome, string> = {
  positive: 'Positive',
  negative: 'Negative',
  pending: 'Pending',
  resolved: 'Resolved',
};

export function CRMOutcomeTag({ outcome }: { outcome: CRMOutcome }) {
  return (
    <span className={`inline-flex items-center h-6 px-2 text-[11px] whitespace-nowrap rounded-full ${outcomeStyles[outcome]}`}>
      {outcomeLabels[outcome]}
    </span>
  );
}

// ─── Contextual Help Tip ──────────────────────────────────────────

interface HelpTipProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function HelpTip({ title, children, icon }: HelpTipProps) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShow(!show)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer px-1 py-0.5"
        aria-label="Help"
        title="Help"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        {title}
      </button>
      {show && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 p-3 bg-white border border-gray-200 rounded-xl shadow-xl text-xs text-gray-600 leading-relaxed animate-fade-in" style={{ minWidth: '280px' }}>
          <div className="flex items-start gap-2">
            {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
            <div>
              <p className="font-semibold text-gray-900 mb-1">{title}</p>
              {children}
            </div>
          </div>
          <button onClick={() => setShow(false)} className="mt-2 text-[10px] text-brand-600 font-medium bg-transparent border-none cursor-pointer hover:underline">
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Onboarding / Context Banner ────────────────────────────────

interface ContextBannerProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'amber';
}

export function ContextBanner({ title, children, icon, color = 'blue' }: ContextBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  const colorStyles = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  return (
    <div className={`flex items-start gap-3 p-4 mb-6 rounded-lg border ${colorStyles[color]}`}>
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        <div className="text-sm mt-0.5 opacity-90">{children}</div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100 text-inherit p-0.5"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
}
