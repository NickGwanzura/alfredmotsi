/**
 * Environment variable validation
 * Run at startup to catch missing env vars early
 */

export function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const missing: string[] = [];

  for (const env of required) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(e => `  - ${e}`).join('\n')}`
    );
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must start with postgresql://');
  }

  console.log('✅ Environment variables validated');
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
