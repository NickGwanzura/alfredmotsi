const buckets = new Map<string, { count: number; resetAt: number }>();

/** Allow a bounded number of user-triggered outbound emails per hour. */
export function consumeOutboundEmail(userId: string, limit = 40): boolean {
  const now = Date.now();
  const key = userId;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  if (buckets.size > 10_000) {
    for (const [entryKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(entryKey);
  }
  return true;
}
