/**
 * Company details shown on every PDF (header + footer).
 * Update here to change branding across all generated documents.
 */
export const COMPANY = {
  name: 'Splashair Air Conditioning (Pvt) Ltd',
  address: 'Splash Air Pvt Ltd',
  phones: ['0715212141', '0773034528'],
  services: [
    'Air Conditioning & Refrigeration',
    'Air Conditioning Equipment & Systems',
    'Air Conditioning Installation',
  ],
} as const;

export const COMPANY_PHONE_LINE = COMPANY.phones.join(' & ');
export const COMPANY_SERVICES_LINE = COMPANY.services.join(', ');
