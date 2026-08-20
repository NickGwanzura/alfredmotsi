type CustomerWithPortalCode = { portalCode?: string | null };

/** Provide a readable label when legacy customer imports contain a blank name. */
export function getCustomerDisplayName(customer: { name?: string | null; email?: string | null }): string {
  const name = customer.name?.trim();
  if (name) return name;

  const email = customer.email?.trim() || '';
  const [localPart, domainPart] = email.split('@');
  const words = (localPart || domainPart || 'Customer')
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  const localLabel = words.join(' ');
  if (!localPart || !domainPart) return localLabel || 'Customer';

  const roleLabels = new Set(['sales', 'info', 'purchasing', 'accounts', 'admin', 'support', 'contact']);
  if (roleLabels.has(localPart.toLowerCase())) {
    const organisation = domainPart.split('.')[0]
      .replace(/[-_]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return `${organisation || 'Customer'} (${localLabel})`;
  }
  return localLabel || 'Customer';
}

export function redactPortalCode<T extends CustomerWithPortalCode>(customer: T, canViewPortalCode: boolean): T {
  if (canViewPortalCode) return customer;
  const safe = { ...customer } as T;
  delete safe.portalCode;
  return safe;
}
