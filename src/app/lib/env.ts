/**
 * Environment variable validation
 * SAFE - never throws, only warns
 */

export function validateEnv(): { valid: boolean; missing: string[]; errors: string[] } {
  const required = ['DATABASE_URL'];

  const missing: string[] = [];
  const errors: string[] = [];

  for (const env of required) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }

  // Accept either AUTH_SECRET (NextAuth v5) or NEXTAUTH_SECRET (v4 compat)
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    missing.push('AUTH_SECRET');
  } else if (process.env.NODE_ENV === 'production' && (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '').length < 32) {
    errors.push('AUTH_SECRET/NEXTAUTH_SECRET must be at least 32 characters in production');
  }

  // NEXTAUTH_URL is required for correct auth redirects
  if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
    missing.push('NEXTAUTH_URL');
  }

  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL) {
    try {
      const origin = new URL(process.env.NEXTAUTH_URL);
      if (origin.protocol !== 'https:') errors.push('NEXTAUTH_URL must use HTTPS in production');
    } catch {
      errors.push('NEXTAUTH_URL must be a valid URL');
    }
  }

  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate DATABASE_URL format (if present)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must start with postgresql:// or postgres://');
  }

  const valid = errors.length === 0;

  return { valid, missing, errors };
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Safe check - never throws
export function checkRequiredEnv(): void {
  const { valid, errors } = validateEnv();
  if (!valid) {
    console.error('=================================');
    console.error('⚠️ MISSING ENVIRONMENT VARIABLES');
    console.error('=================================');
    errors.forEach(e => console.error(`  ❌ ${e}`));
    console.error('=================================');
    console.error('The app will start but may not function correctly.');
    console.error('=================================');
  }
}
