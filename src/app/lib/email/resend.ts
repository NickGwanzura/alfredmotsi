import { Resend } from 'resend';

// Lazy initialization - safe at import time
let resendInstance: Resend | null = null;

export function getResend(): Resend | null {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    try {
      resendInstance = new Resend(process.env.RESEND_API_KEY);
    } catch (error) {
      console.error('Failed to initialize Resend:', error);
      return null;
    }
  }
  return resendInstance;
}

// Backwards compatibility - but lazy
export const resend = process.env.RESEND_API_KEY 
  ? getResend()
  : null;

export const FROM_EMAIL = process.env.FROM_EMAIL || 'Splash Air <noreply@splashair.co.za>';

export function isEmailEnabled(): boolean {
  return !!getResend();
}

// Log status on first import (non-blocking)
if (!process.env.RESEND_API_KEY) {
  console.log('📧 Email disabled: RESEND_API_KEY not set');
} else {
  console.log('📧 Email enabled');
}
