import test from 'node:test';
import assert from 'node:assert/strict';
import { gasMovementStockDelta, validateGasMovementStock } from './gasMovement';

test('used and reused movements draw stock down while recovery adds stock', () => {
  assert.equal(gasMovementStockDelta('used', 2), -2);
  assert.equal(gasMovementStockDelta('reused', 2), -2);
  assert.equal(gasMovementStockDelta('recovered', 2), 2);
});

test('enforces virgin and recovered cylinder semantics', () => {
  const virgin = { stockKind: 'virgin' as const, quantity: 10, remaining: 8 };
  const recovered = { stockKind: 'recovered' as const, quantity: 10, remaining: 3 };
  assert.equal(validateGasMovementStock('used', virgin, 2), null);
  assert.equal(validateGasMovementStock('recovered', virgin, 2), 'Recovered refrigerant must be added to a recovered-gas cylinder');
  assert.equal(validateGasMovementStock('reused', recovered, 2), null);
  assert.equal(validateGasMovementStock('recovered', recovered, 8), 'Recovered quantity exceeds the cylinder capacity');
});
