export type SafeLocation = { lat: number; lng: number; accuracy?: number };

/** Resolve location when permitted, otherwise silently continue without GPS. */
export async function getCurrentPositionSafe(): Promise<SafeLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  try {
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const state = await permissions.query({ name: 'geolocation' });
      if (state.state === 'denied') return null;
    }
  } catch {
    // Permissions API is not available in every browser; try the request.
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
