import crypto from 'crypto';
import { prisma } from '@/app/lib/db';

const DEFAULT_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Keep the normal one-hour expiry, while allowing a bounded operational
 * override in production for support-assisted invites. The expiry is stored
 * with each token, so changing the setting later does not shorten existing
 * links.
 */
function getResetTokenTtlMs(): number {
  const configuredHours = Number(process.env.PASSWORD_RESET_TTL_HOURS);
  if (Number.isFinite(configuredHours) && configuredHours >= 1 && configuredHours <= 24) {
    return configuredHours * 60 * 60 * 1000;
  }
  return DEFAULT_RESET_TOKEN_TTL_MS;
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Create a one-hour, single-use reset token without ever storing the raw token. */
export async function createPasswordResetToken(email: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.deleteMany({
    where: {
      email: email.toLowerCase().trim(),
      OR: [{ used: true }, { expiresAt: { lte: new Date() } }],
    },
  });
  await prisma.passwordResetToken.create({
    data: {
      email: email.toLowerCase().trim(),
      token: hashPasswordResetToken(rawToken),
      expiresAt: new Date(Date.now() + getResetTokenTtlMs()),
    },
  });
  return rawToken;
}

export async function revokePasswordResetToken(rawToken: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { token: hashPasswordResetToken(rawToken) } });
}

/** Invalidate older links before issuing a fresh invite or reset email. */
export async function revokePasswordResetTokensForEmail(email: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({
    where: { email: email.toLowerCase().trim(), used: false },
  });
}
