import type { GasStockItem, GasUsageRecord } from '@/app/types';

interface StockForRules {
  quantity: number;
  remaining: number;
  stockKind: GasStockItem['stockKind'];
  serialNumber?: string | null;
  retiredAt?: Date | string | null;
  certificationExpiresAt?: Date | string | null;
}

function dateOnly(value: Date | string): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || null;
}

export function isCertificationExpired(value: Date | string | null | undefined, today: string): boolean {
  if (!value) return false;
  const expiryDay = dateOnly(value);
  return expiryDay ? expiryDay < today : true;
}

export function stockNeedsPhysicalVerification(stock: Pick<GasStockItem, 'serialNumber'>): boolean {
  return !stock.serialNumber?.trim();
}

export function isLowGasStock(stock: StockForRules): boolean {
  if (stock.retiredAt || stockNeedsPhysicalVerification(stock) || stock.stockKind !== 'virgin') return false;
  return Number.isFinite(stock.quantity) && stock.quantity > 0
    && Number.isFinite(stock.remaining) && stock.remaining >= 0
    && stock.remaining / stock.quantity <= 0.2;
}

export function summarizeGasReport(records: { movementType: string; reversedAt?: Date | string | null; quantityKg: number }[]) {
  const active = records.filter(record => !record.reversedAt && Number.isFinite(record.quantityKg) && record.quantityKg > 0);
  const sum = (type: GasUsageRecord['movementType']) => active
    .filter(record => record.movementType === type)
    .reduce((total, record) => total + record.quantityKg, 0);
  const usedKg = sum('used');
  const reusedKg = sum('reused');
  const recoveredKg = sum('recovered');
  return { usedKg, reusedKg, recoveredKg, chargedKg: usedKg + reusedKg };
}
