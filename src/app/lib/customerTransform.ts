type CustomerWithPortalCode = { portalCode?: string | null };

export function redactPortalCode<T extends CustomerWithPortalCode>(customer: T, canViewPortalCode: boolean): T {
  if (canViewPortalCode) return customer;
  const safe = { ...customer } as T;
  delete safe.portalCode;
  return safe;
}
