import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REFRIGERANT_LABELS,
  toPrismaRefrigerantType,
  toPrismaSystemStatus,
  toRefrigerantLabel,
  toSystemStatusLabel,
} from './refrigerantType';

test('all supported refrigerant labels round-trip through Prisma enum keys', () => {
  for (const label of REFRIGERANT_LABELS) {
    const prismaValue = toPrismaRefrigerantType(label);
    assert.ok(prismaValue, `${label} should have a Prisma mapping`);
    assert.equal(toRefrigerantLabel(prismaValue), label);
  }
});

test('normalizes the R-410A label used by gas stock and job cards', () => {
  assert.equal(toPrismaRefrigerantType('R-410A'), 'R_410A');
  assert.equal(toRefrigerantLabel('R_410A'), 'R-410A');
});

test('rejects blank and unsupported refrigerant values', () => {
  assert.equal(toPrismaRefrigerantType(''), null);
  assert.equal(toPrismaRefrigerantType('R-404A'), null);
  assert.equal(toRefrigerantLabel(null), null);
});

test('normalizes mapped diagnostics status in both directions', () => {
  assert.equal(toPrismaSystemStatus('sub-optimal'), 'sub_optimal');
  assert.equal(toPrismaSystemStatus('sub_optimal'), 'sub_optimal');
  assert.equal(toSystemStatusLabel('sub_optimal'), 'sub-optimal');
  assert.equal(toPrismaSystemStatus('unknown'), null);
});
