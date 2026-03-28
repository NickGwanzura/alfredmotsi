'use client';

import React, { useState } from 'react';
import { signIn } from "next-auth/react";
import { FormItem, Notification } from './ui';

interface LoginProps {
  onLogin?: () => void;
  onPortalLogin?: (customerId: string) => void;
}

export default function Login({ onLogin, onPortalLogin }: LoginProps) {
  const [mode, setMode] = useState<'staff' | 'portal'>('staff');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [portalCode, setPortalCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setL] = useState(false);

  const go = async () => {
    setL(true);
    setErr("");

    if (mode === 'staff') {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/",
        });

        if (result?.error) {
          setErr("The credentials you entered do not match any account.");
        } else {
          onLogin?.();
        }
      } catch (error) {
        setErr("An error occurred during sign in.");
      } finally {
        setL(false);
      }
    } else {
      // Portal login - simplified for demo
      setErr("Portal login not implemented in this demo.");
      setL(false);
    }
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
              
              <FormItem label="Password">
                <input 
                  className="inp" 
                  type="password" 
                  placeholder="Enter your password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
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
                <button 
                  className="btn btn-g btn-sm" 
                  onClick={() => { setEmail("alfred@splashair.co.za"); setPassword("admin123"); }}
                >
                  Alfred (Admin)
                </button>
                <button 
                  className="btn btn-g btn-sm" 
                  onClick={() => { setEmail("sipho@splashair.co.za"); setPassword("tech123"); }}
                >
                  Sipho (Tech)
                </button>
              </div>
              <p style={{ fontSize: "11px", color: "var(--ts)", marginTop: "var(--s3)" }}>
                Passwords: admin123 / tech123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
