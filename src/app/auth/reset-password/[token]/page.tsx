'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cds-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)', padding: 32, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 32 }}>❄</span>
          <h1 style={{ fontSize: 20, fontWeight: 400, marginTop: 8, color: 'var(--cds-text-primary)' }}>Splash Air</h1>
          <p style={{ fontSize: 14, color: 'var(--cds-text-secondary)', marginTop: 4 }}>Reset your password</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div className="notif notif-s" role="status">
              <div>
                <div className="notif-title">Password reset successful</div>
                <div className="notif-body" style={{ marginTop: 4 }}>You can now sign in with your new password.</div>
              </div>
            </div>
            <a href="/" className="btn btn-p" style={{ display: 'inline-flex', marginTop: 16, textDecoration: 'none' }}>Sign in</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="notif notif-e" role="alert" style={{ marginBottom: 16 }}>
                <span>{error}</span>
              </div>
            )}
            <div className="fi">
              <label className="lbl" htmlFor="password">New password</label>
              <input
                id="password"
                className="inp"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="fi">
              <label className="lbl" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                className="inp"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-p"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
