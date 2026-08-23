export const GAS_UNITS = ['kg', 'g', 'lb'] as const;
export type GasUnit = typeof GAS_UNITS[number];

export function normalizeGasUnit(value: unknown): GasUnit | null {
  if (typeof value !== 'string') return null;
  const unit = value.trim().toLowerCase();
  return GAS_UNITS.includes(unit as GasUnit) ? unit as GasUnit : null;
}

export function gasQuantityToKg(quantity: number, unit: GasUnit): number {
  if (!Number.isFinite(quantity)) return Number.NaN;
  if (unit === 'g') return quantity / 1000;
  if (unit === 'lb') return quantity * 0.45359237;
  return quantity;
}

export function gasQuantityFromKg(quantityKg: number, unit: GasUnit): number {
  if (!Number.isFinite(quantityKg)) return Number.NaN;
  if (unit === 'g') return quantityKg * 1000;
  if (unit === 'lb') return quantityKg / 0.45359237;
  return quantityKg;
}

export function formatHarareDateTime(date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Harare', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
