export type SafeLocation = { lat: number; lng: number; accuracy?: number };

/** Resolve location when permitted, otherwise silently continue without GPS. */
export async function getCurrentPositionSafe(): Promise<SafeLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  try {
    // Embedded pages can be denied by the document's Permissions-Policy before
    // the browser reaches the normal permission prompt. Avoid calling the API
    // in that case so the console stays clean and audit capture remains optional.
    const policy = (document as Document & {
      permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
    }).permissionsPolicy;
    if (policy?.allowsFeature && !policy.allowsFeature('geolocation')) return null;

    const permissions = navigator.permissions;
    if (permissions?.query) {
      const state = await permissions.query({ name: 'geolocation' });
      if (state.state === 'denied') return null;
    }
  } catch {
    // A Permissions-Policy denial is not actionable by the user. Treat all
    // permission inspection failures as opt-out rather than triggering a
    // second browser violation from getCurrentPosition.
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => resolve(null),
      { timeout: 6000, enableHighAccuracy: false, maximumAge: 300_000 },
    );
  });
}
