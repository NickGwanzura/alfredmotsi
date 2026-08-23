import test from 'node:test';
import assert from 'node:assert/strict';
import { formatHarareDateTime, gasQuantityFromKg, gasQuantityToKg, normalizeGasUnit } from './gasUnits';

test('normalizes only supported refrigerant units', () => {
  assert.equal(normalizeGasUnit(' KG '), 'kg');
  assert.equal(normalizeGasUnit('oz'), null);
});

test('converts grams and pounds to canonical kilograms', () => {
  assert.equal(gasQuantityToKg(500, 'g'), 0.5);
  assert.ok(Math.abs(gasQuantityToKg(1, 'lb') - 0.45359237) < 1e-10);
  assert.ok(Math.abs(gasQuantityFromKg(0.45359237, 'lb') - 1) < 1e-10);
});

test('formats one consistent Africa/Harare date and time', () => {
  assert.deepEqual(formatHarareDateTime(new Date('2026-08-22T22:30:00Z')), { date: '2026-08-23', time: '00:30' });
});
