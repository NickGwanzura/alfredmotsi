'use client';

import React, { useState, useEffect } from 'react';
import { signIn, signOut } from "next-auth/react";
import { 
  User, 
  Enterprise, 
  ArrowRight, 
  WarningFilled,
  CheckmarkFilled,
  View,
  ViewOff,
  Snowflake
} from '@carbon/icons-react';

interface LoginProps {
  onLogin?: () => void;
  onPortalLogin?: (customerId: string) => void;
}

export default function Login({ onLogin, onPortalLogin }: LoginProps) {
  const [mode, setMode] = useState<'staff' | 'portal'>('staff');
  
  // Check if we need to clear any existing session (from invite email link)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === '1') {
      signOut({ redirect: false });
      // Clear the query param from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [portalCode, setPortalCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateForm = () => {
    if (!email.trim()) {
      setErr("Please enter your email address");
      return false;
    }
    if (mode === 'staff' && !password.trim()) {
      setErr("Please enter your password");
      return false;
    }
    if (mode === 'portal' && !portalCode.trim()) {
      setErr("Please enter your portal access code");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    
    if (!validateForm()) return;
    
    setLoading(true);

    if (mode === 'staff') {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/",
        });

        if (result?.error) {
          setErr("Invalid email or password. Please try again.");
        } else {
          onLogin?.();
        }
      } catch (error) {
        setErr("An error occurred during sign in. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Portal login
      setErr("Portal login feature coming soon.");
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'staff' | 'portal') => {
    setMode(newMode);
    setErr("");
    setEmail("");
    setPassword("");
    setPortalCode("");
  };

  return (
    <div style={styles.container}>
      {/* Left Side - Brand Panel */}
      <div style={styles.brandPanel}>
        <div style={styles.brandContent}>
          {/* Logo Animation */}
          <div style={styles.logoContainer}>
            <div style={styles.logoRing} />
            <div style={styles.logoRing2} />
            <Snowflake size={48} style={styles.logoIcon} />
          </div>
          
          <h1 style={styles.brandTitle}>Splash Air</h1>
          <p style={styles.brandSubtitle}>Professional HVAC Services</p>
          
          <div style={styles.featuresList}>
            <div style={styles.featureItem}>
              <CheckmarkFilled size={20} style={styles.featureIcon} />
              <span style={styles.featureText}>Field Service Management</span>
            </div>
            <div style={styles.featureItem}>
              <CheckmarkFilled size={20} style={styles.featureIcon} />
              <span style={styles.featureText}>Real-time Job Tracking</span>
            </div>
            <div style={styles.featureItem}>
              <CheckmarkFilled size={20} style={styles.featureIcon} />
              <span style={styles.featureText}>Digital Job Cards</span>
            </div>
            <div style={styles.featureItem}>
              <CheckmarkFilled size={20} style={styles.featureIcon} />
              <span style={styles.featureText}>Customer Portal</span>
            </div>
          </div>
        </div>
        
        <div style={styles.versionInfo}>
          <span style={styles.versionText}>Version 10.0</span>
          <span style={styles.copyright}>© 2026 Splash Air Conditioning</span>
        </div>
        
        {/* Background Pattern */}
        <div style={styles.bgPattern} />
      </div>

      {/* Right Side - Login Form */}
      <div style={styles.formPanel}>
        <div style={styles.formContainer}>
          {/* Mode Toggle */}
          <div style={styles.modeToggle}>
            <button
              type="button"
              onClick={() => switchMode('staff')}
              style={{
                ...styles.modeButton,
                ...(mode === 'staff' ? styles.modeButtonActive : {}),
              }}
              aria-pressed={mode === 'staff'}
            >
              <Enterprise size={18} />
              <span>Staff Login</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('portal')}
              style={{
                ...styles.modeButton,
                ...(mode === 'portal' ? styles.modeButtonActive : {}),
              }}
              aria-pressed={mode === 'portal'}
            >
              <User size={18} />
              <span>Client Portal</span>
            </button>
          </div>

          {/* Form Header */}
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>
              {mode === 'staff' ? 'Welcome Back' : 'Client Portal'}
            </h2>
            <p style={styles.formSubtitle}>
              {mode === 'staff' 
                ? 'Sign in to access your dashboard' 
                : 'Track your service requests online'}
            </p>
          </div>

          {/* Error Message */}
          {err && (
            <div style={styles.errorMessage} role="alert">
              <WarningFilled size={20} />
              <span>{err}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Email Field */}
            <div style={styles.fieldGroup}>
              <label 
                htmlFor="email" 
                style={{
                  ...styles.label,
                  ...(focusedField === 'email' ? styles.labelFocused : {}),
                }}
              >
                Email Address
              </label>
              <div style={styles.inputWrapper}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={mode === 'staff' ? "you@splashaircrmzw.site" : "your@email.com"}
                  style={{
                    ...styles.input,
                    ...(focusedField === 'email' ? styles.inputFocused : {}),
                  }}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {mode === 'staff' ? (
              /* Password Field */
              <div style={styles.fieldGroup}>
                <label 
                  htmlFor="password"
                  style={{
                    ...styles.label,
                    ...(focusedField === 'password' ? styles.labelFocused : {}),
                  }}
                >
                  Password
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    style={{
                      ...styles.input,
                      ...(focusedField === 'password' ? styles.inputFocused : {}),
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <ViewOff size={20} /> : <View size={20} />}
                  </button>
                </div>
              </div>
            ) : (
              /* Portal Code Field */
              <div style={styles.fieldGroup}>
                <label 
                  htmlFor="portalCode"
                  style={{
                    ...styles.label,
                    ...(focusedField === 'portalCode' ? styles.labelFocused : {}),
                  }}
                >
                  Portal Access Code
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    id="portalCode"
                    type="text"
                    value={portalCode}
                    onChange={(e) => setPortalCode(e.target.value.toUpperCase())}
                    onFocus={() => setFocusedField('portalCode')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    style={{
                      ...styles.input,
                      ...styles.codeInput,
                      ...(focusedField === 'portalCode' ? styles.inputFocused : {}),
                    }}
                    disabled={loading}
                  />
                </div>
                <span style={styles.helperText}>
                  Found on your service invoice or email
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonLoading : {}),
              }}
            >
              {loading ? (
                <>
                  <span style={styles.spinner} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Help Links */}
          <div style={styles.helpSection}>
            {mode === 'staff' ? (
              <>
                <a href="#" style={styles.helpLink}>Forgot password?</a>
                <span style={styles.helpDivider}>•</span>
                <a href="#" style={styles.helpLink}>Contact IT Support</a>
              </>
            ) : (
              <>
                <span style={styles.helpText}>Don&apos;t have a portal code?</span>
                <a href="#" style={styles.helpLink}>Request Access</a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Background Overlay */}
      <div style={styles.mobileOverlay} />
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
    position: 'relative',
  },
  
  // Brand Panel (Left Side)
  brandPanel: {
    width: 480,
    background: 'linear-gradient(135deg, #0f62fe 0%, #0043ce 50%, #002d9c 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px 56px',
    position: 'relative',
    overflow: 'hidden',
    color: '#ffffff',
  },
  brandContent: {
    position: 'relative',
    zIndex: 2,
  },
  logoContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
  },
  logoRing2: {
    position: 'absolute',
    width: 60,
    height: 60,
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite 0.5s',
  },
  logoIcon: {
    color: '#ffffff',
    position: 'relative',
    zIndex: 1,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: 300,
    marginBottom: 8,
    letterSpacing: '-0.5px',
  },
  brandSubtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 48,
    fontWeight: 400,
  },
  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
  },
  featureIcon: {
    opacity: 0.9,
  },
  featureText: {
    opacity: 0.9,
  },
  versionInfo: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  versionText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    opacity: 0.5,
  },
  copyright: {
    fontSize: 12,
    opacity: 0.4,
  },
  bgPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)
    `,
    zIndex: 1,
  },
  
  // Form Panel (Right Side)
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    background: '#f4f4f4',
    position: 'relative',
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    background: '#ffffff',
    padding: '48px',
    borderRadius: 0,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  
  // Mode Toggle
  modeToggle: {
    display: 'flex',
    gap: 0,
    marginBottom: 32,
    borderBottom: '2px solid #e0e0e0',
  },
  modeButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 400,
    color: '#525252',
    transition: 'all 0.11s ease',
  },
  modeButtonActive: {
    borderBottomColor: '#0f62fe',
    color: '#161616',
    fontWeight: 600,
  },
  
  // Form Header
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 300,
    color: '#161616',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#525252',
  },
  
  // Error Message
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px',
    background: '#fff1f1',
    borderLeft: '3px solid #da1e28',
    marginBottom: 24,
    fontSize: 14,
    color: '#9b1c1c',
  },
  
  // Form Fields
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 400,
    color: '#525252',
    letterSpacing: '0.32px',
    transition: 'color 0.11s ease',
  },
  labelFocused: {
    color: '#0f62fe',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    padding: '0 16px',
    fontSize: 14,
    fontFamily: "'IBM Plex Sans', sans-serif",
    color: '#161616',
    background: '#f4f4f4',
    border: 'none',
    borderBottom: '2px solid #8d8d8d',
    outline: 'none',
    transition: 'all 0.11s ease',
  },
  inputFocused: {
    borderBottomColor: '#0f62fe',
    background: '#ffffff',
  },
  codeInput: {
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#525252',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6f6f6f',
    marginTop: 4,
  },
  
  // Submit Button
  submitButton: {
    height: 48,
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: '#0f62fe',
    color: '#ffffff',
    border: 'none',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '0.16px',
    cursor: 'pointer',
    transition: 'all 0.11s ease',
  },
  submitButtonLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  // Help Section
  helpSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    fontSize: 14,
  },
  helpText: {
    color: '#525252',
  },
  helpLink: {
    color: '#0f62fe',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.11s ease',
  },
  helpDivider: {
    color: '#c6c6c6',
  },
  
  // Mobile Overlay
  mobileOverlay: {
    display: 'none',
  },
};

// ============================================
// KEYFRAME ANIMATIONS (Injected via style tag)
// ============================================

const animations = `
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.5;
    }
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  @media (max-width: 768px) {
    .login-container {
      flex-direction: column;
    }
    
    .brand-panel {
      width: 100%;
      min-height: 200px;
      padding: 32px 24px;
    }
    
    .form-panel {
      padding: 24px;
    }
    
    .form-container {
      padding: 32px 24px;
      box-shadow: none;
    }
  }
`;

// Inject animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animations;
  document.head.appendChild(style);
}
