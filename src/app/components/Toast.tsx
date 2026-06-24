'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (title: string, body?: string, kind?: ToastKind, duration?: number) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  warning: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

// ─── Context ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ─── Icons ───────────────────────────────────────────────

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const STYLES: Record<ToastKind, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
};

// ─── Provider ────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (title: string, body?: string, kind: ToastKind = 'info', duration: number = 4000) => {
      const id = `toast-${++idCounter.current}`;
      setToasts((prev) => [...prev, { id, kind, title, body, duration }]);
    },
    []
  );

  const toast = useCallback(
    (title: string, body?: string, kind?: ToastKind, duration?: number) => {
      addToast(title, body, kind, duration);
    },
    [addToast]
  );

  const success = useCallback((title: string, body?: string) => addToast(title, body, 'success'), [addToast]);
  const error = useCallback((title: string, body?: string) => addToast(title, body, 'error'), [addToast]);
  const warning = useCallback((title: string, body?: string) => addToast(title, body, 'warning'), [addToast]);
  const info = useCallback((title: string, body?: string) => addToast(title, body, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Toast container - fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ──────────────────────────────────────────

function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: () => void }) {
  const dur = t.duration ?? 4000;

  useEffect(() => {
    if (dur <= 0) return;
    const timer = setTimeout(onClose, dur);
    return () => clearTimeout(timer);
  }, [dur, onClose]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl ${STYLES[t.kind]} animate-slide-up`}
      style={{ animation: 'slideUp 0.3s ease' }}
    >
      <span className="shrink-0 mt-0.5">{ICONS[t.kind]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t.title}</p>
        {t.body && <p className="text-sm opacity-90 mt-0.5">{t.body}</p>}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 bg-transparent border-none cursor-pointer text-white/70 hover:text-white p-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
