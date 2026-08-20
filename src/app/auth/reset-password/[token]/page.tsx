'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { KeyRound, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Reset token is missing');
      return;
    }
    let cancelled = false;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setTokenValid(response.ok && data.valid === true);
        if (!response.ok) setError(data.error || 'Invalid or expired reset link');
      })
      .catch(() => {
        if (!cancelled) {
          setTokenValid(false);
          setError('Could not verify this reset link. Please request a new one.');
        }
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tokenValid !== true) {
      setError('This reset link is invalid or expired. Please request a new one.');
      return;
    }
    if (!password || password.length < 12) {
      setError('Password must be at least 12 characters');
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
        // Auto-redirect to login after 3 seconds
        setTimeout(() => router.push('/'), 3000);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10 sm:px-6 font-grift" style={{ fontFamily: "'Grift'" }}>
      <div className="w-full max-w-[520px]">
        {/* Full Splash Air mark, positioned like the main sign-in screen. */}
        <div className="relative z-20 flex justify-center -mb-5">
          <div className="h-[112px] w-[280px] overflow-hidden sm:h-[124px] sm:w-[320px]" aria-label="Splash Air Conditioning">
            <Image
              src="/logos.svg"
              alt="Splash Air Conditioning"
              width={320}
              height={180}
              priority
              className="block h-auto w-[280px] drop-shadow-[0_4px_16px_rgba(9,58,104,0.16)] sm:w-[320px]"
            />
          </div>
        </div>

        {/* Card */}
        <div className="relative z-10 overflow-hidden rounded-2xl bg-white px-6 pb-10 pt-14 shadow-[0_4px_24px_rgba(0,0,0,0.08)] sm:px-12 sm:pb-12">
          {success ? (
            /* Success State */
            <div className="py-3 text-center sm:py-5">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">Password reset successful</h2>
              <p className="mb-6 text-sm text-gray-500">
                You can now sign in with your new password.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-lg shadow-brand-600/20"
              >
                Sign in
              </Link>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit}>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <KeyRound className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-[26px] font-semibold leading-tight text-gray-900">Reset your password</h2>
                  <p className="mt-1 text-sm text-gray-500">Enter your new password below</p>
                </div>
              </div>

              {/* Error */}
              {tokenValid === null && !error && <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">Checking reset link…</div>}
              {error && (
                <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-50 border border-red-100" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* New Password */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    className="block w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="confirm">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    className="block w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || tokenValid !== true}
                className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-600/20 mb-4"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset password'
                )}
              </button>

              {/* Back link */}
              <div className="text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-400">
          Splash Air Conditioning — Field Service Management
        </p>
      </div>
    </div>
  );
}
