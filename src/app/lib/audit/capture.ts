/**
 * Silent, fire-and-forget audit capture.
 * Never throws, never blocks UI.
 */
export function captureAudit(
  action: 'login' | 'view_job' | 'edit_job' | 'complete_job',
  jobId?: string
): void {
  const sendLog = (lat?: number, lng?: number, acc?: number) => {
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        jobId: jobId ?? null,
        latitude: lat ?? null,
        longitude: lng ?? null,
        accuracy: acc ?? null,
      }),
    }).catch(() => {
      // Intentionally silent
    });
  };

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLog(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => sendLog(), // denied or unavailable — still log without coords
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 300_000 }
    );
  } else {
    sendLog();
  }
}
