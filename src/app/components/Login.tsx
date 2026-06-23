'use client';

import React, { useState, useEffect } from 'react';
import { signIn, signOut } from "next-auth/react";
import {
  User,
  Building2,
  ArrowRight,
  AlertTriangle,
  CheckCheck,
  Eye,
  EyeOff,
  Container,
} from 'lucide-react';

interface LoginProps {
  onLogin?: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'staff' | 'portal' | 'standalone'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [portalCode, setPortalCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === '1') signOut({ redirect: false });
    } catch {
      // Safe to ignore — signOut may fail if not authenticated
    }
  }, []);

  const validateForm = () => {
    if (!email.trim()) { setErr("Please enter your email address"); return false; }
    if (mode !== 'portal' && !password.trim()) { setErr("Please enter your password"); return false; }
    if (mode === 'portal' && !portalCode.trim()) { setErr("Please enter your portal access code"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!validateForm()) return;
    setLoading(true);

    if (mode === 'staff') {
      try {
        const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
        if (result?.error) setErr("Invalid email or password. Please try again.");
        else onLogin?.();
      } catch (error) {
        setErr("An unexpected error occurred. Please try again.");
      }
    } else if (mode === 'portal') {
      setErr("Portal login feature coming soon.");
    }
    setLoading(false);
  };

  const switchMode = (newMode: 'staff' | 'portal' | 'standalone') => {
    setMode(newMode);
    setErr(""); setEmail(""); setPassword(""); setPortalCode("");
    setForgotMode(false); setResetEmail(""); setResetSent(false); setResetSending(false);
  };

  return (
    <div className="min-h-screen flex bg-surface font-grift" style={{ fontFamily: "'Grift', 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Left Side - Brand Panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between px-14 py-12 relative overflow-hidden text-white">
        {/* Background Image - behind gradient */}
        <img src="/commercial-comfort.jpg" alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00695c]/90 via-[#004d40]/85 to-[#00332a]/90 z-[1]" />
        <div className="relative z-10">
          <div className="mb-10 flex items-center justify-center w-[140px] h-[140px] rounded-2xl bg-white/10 backdrop-blur-sm">
            <img src="/logos.svg" alt="Splash Air" className="w-full max-w-[120px] h-auto" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }} />
          </div>
          <h1 className="text-[42px] font-light mb-2 tracking-tight">Splash Air</h1>
          <p className="text-base opacity-80 mb-12 font-light">Professional HVAC Services</p>
          <div className="flex flex-col gap-4">
            {['Field Service Management', 'Real-time Job Tracking', 'Digital Job Cards', 'Customer Portal'].map((text) => (
              <div key={text} className="flex items-center gap-3 text-sm opacity-85">
                <CheckCheck size={20} className="opacity-90 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <p className="text-[11px] opacity-50 leading-relaxed">
            System developed &amp; maintained by<br />
            <a href="https://www.spiritusglobal.tech" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline underline-offset-2">
              Spiritus Systems
            </a>
          </p>
          <span className="block text-[11px] font-semibold tracking-[1px] opacity-60 mb-1">Version 10.0</span>
          <span className="block text-[11px] opacity-40">&copy; 2026 Splash Air Conditioning</span>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-surface p-6 relative z-10">
        <div className="w-full max-w-[420px] bg-white p-12 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logos.svg" alt="Splash Air" className="w-20 h-auto" />
          </div>

          {/* Mode Toggle */}
          <div className="flex mb-8 border-b-2 border-[var(--color-border-subtle)]">
            {[
              { key: 'staff' as const, label: 'Staff Login', Icon: Building2 },
              { key: 'standalone' as const, label: 'Forgot Password', Icon: Container },
              { key: 'portal' as const, label: 'Client Portal', Icon: User },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 -mb-[2px] bg-transparent border-transparent cursor-pointer transition-all ${
                  mode === key
                    ? 'text-[var(--color-text-primary)] font-semibold border-b-[var(--color-brand-600)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
                aria-pressed={mode === key}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-[28px] font-semibold text-[var(--color-text-primary)] mb-2">
              {mode === 'staff' ? 'Welcome Back' : mode === 'standalone' ? 'Reset your password' : 'Client Portal'}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {mode === 'staff' ? 'Sign in to access your dashboard' : mode === 'standalone' ? 'Enter your email to receive a reset link' : 'Track your service requests online'}
            </p>
          </div>

          {/* Error Message */}
          {err && (
            <div className="flex items-start gap-3 p-4 mb-6 text-sm text-[#991b1b] bg-[#fef2f2] border-l-4 border-[var(--color-support-error)] rounded-lg" role="alert">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'standalone' ? (
            resetSent ? (
              <div className="flex items-start gap-3 p-4 mb-6 text-sm bg-[#f0fdf4] border-l-4 border-[var(--color-support-success)] rounded-lg" role="status">
                <CheckCheck size={22} className="shrink-0 mt-0.5 text-[var(--color-support-success)]" />
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">Check your email</p>
                  <p className="mt-1 text-[var(--color-text-secondary)]">If an account exists for {resetEmail}, you&apos;ll receive a reset link.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full h-12 px-4 text-sm text-[var(--color-text-primary)] bg-[#f9fafb] border-[1.5px] border-[var(--color-border-subtle)] rounded-xl outline-none transition-all focus:border-[var(--color-brand-600)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,105,92,0.1)]"
                    onFocus={() => setFocusedField('resetEmail')}
                    onBlur={() => setFocusedField(null)}
                    disabled={resetSending}
                    style={{ fontFamily: "'Grift', 'IBM Plex Sans', sans-serif" }}
                  />
                </div>
                <button
                  type="button"
                  disabled={resetSending || !resetEmail.trim()}
                  className="w-full h-12 flex items-center justify-center gap-3 mt-2 bg-[var(--color-brand-600)] text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={async () => {
                    setResetSending(true); setErr("");
                    try {
                      const res = await fetch('/api/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: resetEmail }),
                      });
                      if (res.ok) setResetSent(true);
                      else { const d = await res.json().catch(() => ({})); setErr(d.error || 'Failed to send reset email.'); }
                    } catch { setErr('Network error — please try again.'); }
                    finally { setResetSending(false); }
                  }}
                >
                  {resetSending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : <><ArrowRight size={20} /> Send reset link</>}
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-[var(--color-text-secondary)] transition-colors" style={{ color: focusedField === 'email' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)' }}>Email Address</label>
                <input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  placeholder={mode === 'staff' ? "you@splashaircrmzw.site" : "your@email.com"}
                  className="w-full h-12 px-4 text-sm text-[var(--color-text-primary)] bg-[#f9fafb] border-[1.5px] border-[var(--color-border-subtle)] rounded-xl outline-none transition-all focus:border-[var(--color-brand-600)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,105,92,0.1)]"
                  autoComplete="email" disabled={loading}
                  style={{ fontFamily: "'Grift', 'IBM Plex Sans', sans-serif" }}
                />
              </div>

              {/* Password or Portal Code */}
              {mode === 'portal' ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="portalCode" className="text-sm font-medium text-[var(--color-text-secondary)]">Portal Access Code</label>
                  <input
                    id="portalCode" type="text" value={portalCode}
                    onChange={e => setPortalCode(e.target.value.toUpperCase())}
                    onFocus={() => setFocusedField('portalCode')} onBlur={() => setFocusedField(null)}
                    placeholder="XXXX-XXXX" maxLength={9}
                    className="w-full h-12 px-4 text-sm text-[var(--color-text-primary)] bg-[#f9fafb] border-[1.5px] border-[var(--color-border-subtle)] rounded-xl outline-none transition-all focus:border-[var(--color-brand-600)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,105,92,0.1)] tracking-[2px] uppercase"
                    disabled={loading}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <span className="text-xs text-[var(--color-text-helper)] mt-1">Found on your service invoice or email</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
                  <div className="relative flex items-center">
                    <input
                      id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      className="w-full h-12 px-4 pr-12 text-sm text-[var(--color-text-primary)] bg-[#f9fafb] border-[1.5px] border-[var(--color-border-subtle)] rounded-xl outline-none transition-all focus:border-[var(--color-brand-600)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,105,92,0.1)]"
                      autoComplete="current-password" disabled={loading}
                      style={{ fontFamily: "'Grift', 'IBM Plex Sans', sans-serif" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 bg-transparent border-none cursor-pointer text-[var(--color-text-secondary)] p-1 flex items-center" aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="w-full h-12 flex items-center justify-center gap-3 mt-2 bg-[var(--color-brand-600)] text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</> : <><span>Sign In</span><ArrowRight size={20} /></>}
              </button>
            </form>
          )}

          {/* Help Section — only for staff/portal */}
          {mode !== 'standalone' && (
            <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)] flex items-center justify-center gap-4 text-sm">
              {mode !== 'portal' ? (
                <a href="mailto:alfred@splashaircrmzw.site" className="text-[var(--color-brand-600)] no-underline font-medium cursor-pointer">Contact IT Support</a>
              ) : (
                <>
                  <span className="text-[var(--color-text-secondary)] text-sm">Don&apos;t have a portal code?</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert('Portal access is managed by your administrator.'); }} className="text-[var(--color-brand-600)] no-underline font-medium cursor-pointer">Request Access</a>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      <div className="hidden" />
    </div>
  );
}
