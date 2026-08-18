type Attempt = { failures: number; resetAt: number; blockedUntil: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const BLOCK_MS = 15 * 60 * 1000;
const attempts = new Map<string, Attempt>();

function prune(now: number): void {
  if (attempts.size < 10_000) return;
  for (const [key, value] of attempts) {
    if (value.resetAt <= now && value.blockedUntil <= now) attempts.delete(key);
  }
}

function keyFor(email: string, request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  return `${email.toLowerCase().trim()}|${forwarded || real || 'unknown'}`;
}

export function isLoginBlocked(email: string, request: Request): boolean {
  const now = Date.now();
  prune(now);
  const attempt = attempts.get(keyFor(email, request));
  return Boolean(attempt && attempt.blockedUntil > now);
}

export function recordLoginFailure(email: string, request: Request): void {
  const now = Date.now();
  const key = keyFor(email, request);
  const current = attempts.get(key);
  const attempt = !current || current.resetAt <= now
    ? { failures: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 }
    : current;
  attempt.failures += 1;
  if (attempt.failures >= MAX_FAILURES) attempt.blockedUntil = now + BLOCK_MS;
  attempts.set(key, attempt);
  prune(now);
}

export function clearLoginFailures(email: string, request: Request): void {
  attempts.delete(keyFor(email, request));
}
