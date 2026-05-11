/**
 * Silent, fire-and-forget audit capture with retry and fallback queue.
 * Never throws, never blocks UI.
 */
const AUDIT_QUEUE_KEY = 'audit_queue';

// Try to send a single audit event; returns true on success
async function sendAuditEvent(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Flush queued events from localStorage
async function flushQueue(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(AUDIT_QUEUE_KEY);
  if (!raw) return;
  let queue: unknown[];
  try {
    queue = JSON.parse(raw);
  } catch {
    queue = [];
  }
  if (!Array.isArray(queue) || queue.length === 0) {
    localStorage.removeItem(AUDIT_QUEUE_KEY);
    return;
  }
  const remaining: unknown[] = [];
  for (const item of queue) {
    const ok = await sendAuditEvent(item as Record<string, unknown>);
    if (!ok) remaining.push(item);
  }
  if (remaining.length === 0) {
    localStorage.removeItem(AUDIT_QUEUE_KEY);
  } else {
    localStorage.setItem(AUDIT_QUEUE_KEY, JSON.stringify(remaining));
  }
}

// Flush on page load
if (typeof window !== 'undefined') {
  flushQueue().catch(() => {});
}

/**
 * Capture an audit event.
 * Retries up to 3 times with backoff, then falls back to localStorage.
 */
export async function captureAudit(
  action: 'login' | 'view_job' | 'edit_job' | 'complete_job' | 'delete_job' | 'adjust_stock' | 'create_customer' | 'update_customer' | 'delete_customer' | 'create_gas_stock' | 'update_gas_stock' | 'delete_gas_stock' | 'create_consumable' | 'delete_consumable' | 'create_user' | 'update_user' | 'delete_user',
  jobId?: string
): Promise<void> {
  let lat: number | undefined, lng: number | undefined, acc: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, () => ({} as any), { timeout: 5000, enableHighAccuracy: false, maximumAge: 300_000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      acc = pos.coords.accuracy;
    } catch {
      // ignore geolocation errors
    }
  }

  const payload = {
    action,
    jobId: jobId ?? null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    accuracy: acc ?? null,
  };

  let attempts = 0;
  const maxAttempts = 3;

  try {
    while (attempts < maxAttempts) {
      attempts++;
      if (await sendAuditEvent(payload)) return;
      if (attempts < maxAttempts) {
        await new Promise(res => setTimeout(res, Math.pow(2, attempts) * 100));
      }
    }
    // Queue after exhausting retries
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(AUDIT_QUEUE_KEY);
      const queue: unknown[] = raw ? JSON.parse(raw) : [];
      queue.push(payload);
      localStorage.setItem(AUDIT_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // swallow
  }
}
