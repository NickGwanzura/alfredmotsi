'use client';

import React, { useState } from 'react';
import { User } from '@/app/types';
import { SEED_USERS, ADMIN_EMAIL } from '@/app/data/seed';
import { FormItem, Notification } from './ui';

interface LoginProps {
  onLogin: (user: User) => void;
  onPortalLogin?: (customerId: string) => void;
}

export default function Login({ onLogin, onPortalLogin }: LoginProps) {
  const [mode, setMode] = useState<'staff' | 'portal'>('staff');
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [portalCode, setPortalCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setL] = useState(false);

  const go = () => {
    setL(true);
    setErr("");
    setTimeout(() => {
      if (mode === 'staff') {
        const u = SEED_USERS.find(u => u.email === email && u.pin === pin);
        u ? onLogin(u) : setErr("The credentials you entered do not match any account.");
      } else {
        // Portal login - simplified for demo
        setErr("Portal login not implemented in this demo.");
      }
      setL(false);
    }, 500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      <div style={{ 
        width: 360, 
        background: "var(--bp)", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        padding: "var(--s8) var(--s7)" 
      }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: "var(--s6)", color: "#fff" }}>❄</div>
          <h1 style={{ fontSize: "32px", fontWeight: 300, color: "#fff", lineHeight: 1.2, marginBottom: "var(--s4)" }}>
            Splash Air
          </h1>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: "16px", lineHeight: 1.6 }}>
            Field Service Management Platform
          </p>
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".1em" }}>
            Version 10.0
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--s7)" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", gap: 0, marginBottom: "var(--s5)", borderBottom: "2px solid var(--bs1)" }}>
            <button 
              className="btn btn-g" 
              style={{ borderBottom: mode === 'staff' ? '2px solid var(--bp)' : 'none', marginBottom: '-2px' }}
              onClick={() => setMode('staff')}
            >
              Staff Login
            </button>
            <button 
              className="btn btn-g" 
              style={{ borderBottom: mode === 'portal' ? '2px solid var(--bp)' : 'none', marginBottom: '-2px' }}
              onClick={() => setMode('portal')}
            >
              Client Portal
            </button>
          </div>

          <h2 style={{ fontSize: "28px", fontWeight: 300, marginBottom: "var(--s3)", color: "var(--tp)" }}>
            {mode === 'staff' ? 'Sign in' : 'Client Portal'}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--ts)", marginBottom: "var(--s7)" }}>
            {mode === 'staff' ? 'Use your Splash Air credentials' : 'Enter your email and portal access code'}
          </p>
          
          {mode === 'staff' ? (
            <>
              <FormItem label="Email address">
                <input 
                  className="inp" 
                  type="email" 
                  placeholder="you@splashair.co.za" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  onKeyDown={e => e.key === "Enter" && go()} 
                />
              </FormItem>
              
              <FormItem label="PIN">
                <input 
                  className="inp" 
                  type="password" 
                  maxLength={6} 
                  placeholder="Enter your PIN" 
                  value={pin} 
                  onChange={e => setPin(e.target.value)} 
                  onKeyDown={e => e.key === "Enter" && go()} 
                />
              </FormItem>
            </>
          ) : (
            <>
              <FormItem label="Email address">
                <input 
                  className="inp" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </FormItem>
              
              <FormItem label="Portal Access Code">
                <input 
                  className="inp" 
                  type="text" 
                  maxLength={8} 
                  placeholder="XXXXXX" 
                  value={portalCode} 
                  onChange={e => setPortalCode(e.target.value.toUpperCase())} 
                />
              </FormItem>
            </>
          )}

          {err && <Notification kind="e" title="Authentication failed" body={err} />}
          
          <button 
            className="btn btn-p" 
            style={{ width: "100%", justifyContent: "center", marginTop: "var(--s5)" }} 
            onClick={go} 
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>

          {mode === 'staff' && (
            <div style={{ marginTop: "var(--s7)", borderTop: "1px solid var(--bs1)", paddingTop: "var(--s5)" }}>
              <p style={{ fontSize: "11px", color: "var(--th)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "var(--s3)" }}>
                Demo accounts
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
                {SEED_USERS.map(u => (
                  <button 
                    key={u.id} 
                    className="btn btn-g btn-sm" 
                    onClick={() => { setEmail(u.email); setPin(u.pin || ""); }}
                  >
                    {u.name.split(" ")[0]} ({u.role === "admin" ? "Admin" : "Tech"})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
