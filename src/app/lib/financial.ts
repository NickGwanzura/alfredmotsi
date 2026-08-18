import { cleanText, nonNegativeNumber, boundedNumber } from './serviceAuth';

export type SafeLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemId: string | null;
  pricebookItemId: string | null;
  category: string;
};

const MAX_MONEY = 100_000_000;

export function money(value: unknown): number | null {
  const parsed = nonNegativeNumber(value);
  return parsed === null || parsed > MAX_MONEY ? null : Math.round(parsed * 100) / 100;
}

export function isoDate(value: unknown): string | null {
  const date = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

export function parseLineItems(value: unknown): SafeLineItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const items: SafeLineItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const description = cleanText(item.description, 500);
    const quantity = nonNegativeNumber(item.quantity);
    const unitPrice = money(item.unitPrice);
    if (!description || quantity === null || quantity <= 0 || unitPrice === null) return null;
    const total = Math.round(quantity * unitPrice * 100) / 100;
    if (!Number.isFinite(total) || total > MAX_MONEY) return null;
    items.push({
      description,
      quantity,
      unitPrice,
      total,
      itemId: typeof item.itemId === 'string' ? item.itemId.trim().slice(0, 100) || null : null,
      pricebookItemId: typeof item.pricebookItemId === 'string' ? item.pricebookItemId.trim().slice(0, 100) || null : null,
      category: cleanText(item.category, 80) || 'service',
    });
  }
  return items;
}

export function calculateTotals(items: SafeLineItem[], taxRateValue: unknown, discountValue: unknown) {
  const taxRate = taxRateValue == null || taxRateValue === '' ? 15.5 : boundedNumber(taxRateValue, 0, 100);
  if (taxRate === null) return null;
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const discount = discountValue == null || discountValue === '' ? 0 : money(discountValue);
  if (discount === null || discount > subtotal) return null;
  const tax = Math.round((subtotal - discount) * (taxRate / 100) * 100) / 100;
  return { subtotal, discount, taxRate, tax, total: Math.round((subtotal - discount + tax) * 100) / 100 };
}
