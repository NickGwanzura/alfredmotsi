import assert from 'node:assert/strict';
import test from 'node:test';
import { isCertificationExpired, isLowGasStock, summarizeGasReport } from './gasStockRules';

test('certification remains valid through its expiry day', () => {
  assert.equal(isCertificationExpired('2026-08-23T00:00:00.000Z', '2026-08-23'), false);
  assert.equal(isCertificationExpired('2026-08-22T00:00:00.000Z', '2026-08-23'), true);
});

test('low-stock alarms exclude retired, recovery, waste, and unidentified cylinders', () => {
  const base = { quantity: 10, remaining: 2, stockKind: 'virgin' as const, serialNumber: 'CYL-1', retiredAt: null, certificationExpiresAt: null };
  assert.equal(isLowGasStock(base), true);
  assert.equal(isLowGasStock({ ...base, retiredAt: '2026-08-23' }), false);
  assert.equal(isLowGasStock({ ...base, stockKind: 'recovered' }), false);
  assert.equal(isLowGasStock({ ...base, stockKind: 'waste' }), false);
  assert.equal(isLowGasStock({ ...base, serialNumber: null }), false);
});

test('gas report separates recovered gas from charged gas', () => {
  const totals = summarizeGasReport([
    { movementType: 'used', reversedAt: null, quantityKg: 2 },
    { movementType: 'reused', reversedAt: null, quantityKg: 1 },
    { movementType: 'recovered', reversedAt: null, quantityKg: 4 },
    { movementType: 'used', reversedAt: '2026-08-23', quantityKg: 10 },
  ]);
  assert.deepEqual(totals, { usedKg: 2, reusedKg: 1, recoveredKg: 4, chargedKg: 3 });
});
