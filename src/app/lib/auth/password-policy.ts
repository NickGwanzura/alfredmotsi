export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
const COMMON_PASSWORDS = new Set([
  'password', 'password123', 'password1234', 'qwerty', 'qwerty123',
  'letmein', 'welcome', 'welcome123', 'admin', 'admin123', 'changeme',
  'splashair', 'splashair123', '123456789012',
]);

export function validateNewPassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be no more than ${PASSWORD_MAX_LENGTH} characters`;
  }
  const normalized = value.toLowerCase().replace(/\s+/g, '');
  if (COMMON_PASSWORDS.has(normalized) || new Set(value).size < 4) {
    return 'Choose a less predictable password';
  }
  return null;
}
