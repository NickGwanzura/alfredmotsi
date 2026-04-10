'use client';

import React, { useState } from 'react';
import { WarningFilled, View, ViewOff } from '@carbon/icons-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
  isTempPassword: boolean;
  onSuccess: () => void;
  onLogout: () => void;
}

export default function PasswordChangeModal({
  isOpen,
  isTempPassword,
  onSuccess,
  onLogout,
}: PasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#24a148', fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Password Changed!</h2>
            <p style={{ margin: 0, color: '#525252' }}>Your password has been updated successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <WarningFilled size={24} style={{ color: '#f1c21b' }} />
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {isTempPassword ? 'Set Your Password' : 'Change Password'}
            </h2>
          </div>

          {isTempPassword && (
            <p style={{ margin: '0 0 16px', color: '#525252', fontSize: 14 }}>
              You logged in with a temporary password. Please create a new secure password to continue.
            </p>
          )}

          {error && (
            <div style={errorStyle}>
              <WarningFilled size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={inputStyle}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={toggleStyle}
                  tabIndex={-1}
                >
                  {showPassword ? <ViewOff size={16} /> : <View size={16} />}
                </button>
              </div>
              <small style={{ color: '#6f6f6f', fontSize: 12 }}>
                Minimum 8 characters
              </small>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              {isTempPassword && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={secondaryButtonStyle}
                  disabled={loading}
                >
                  Logout
                </button>
              )}
              <button
                type="submit"
                style={primaryButtonStyle}
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 4,
  width: '100%',
  maxWidth: 400,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px',
  backgroundColor: '#fff1f1',
  color: '#da1e28',
  borderRadius: 4,
  marginBottom: 16,
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: '#161616',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 40px 10px 12px',
  fontSize: 14,
  border: '1px solid #8d8d8d',
  borderRadius: 4,
  outline: 'none',
  boxSizing: 'border-box',
};

const toggleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  color: '#525252',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  backgroundColor: '#0f62fe',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  backgroundColor: 'transparent',
  color: '#525252',
  border: '1px solid #8d8d8d',
  borderRadius: 4,
  cursor: 'pointer',
};
