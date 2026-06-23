import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random password.
 * Uses crypto.randomBytes() instead of Math.random().
 */
export function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + special;

  // Generate random bytes
  const bytes = crypto.randomBytes(length);
  const password: string[] = [];

  // Ensure at least one of each character type
  password.push(upper[bytes[0] % upper.length]);
  password.push(lower[bytes[1] % lower.length]);
  password.push(digits[bytes[2] % digits.length]);
  password.push(special[bytes[3] % special.length]);

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password.push(all[bytes[i] % all.length]);
  }

  // Fisher-Yates shuffle for unbiased randomization
  for (let i = password.length - 1; i > 0; i--) {
    const j = bytes[i + 4] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

/**
 * Generate a cryptographically secure numeric PIN.
 */
export function generatePIN(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += (bytes[i] % 10).toString();
  }
  return pin;
}
