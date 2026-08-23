import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidTransferPair, lifecycleRequestMatches, oppositeTransferMovement } from './gasLifecycle';

test('lifecycle replay identity includes the transfer destination', () => {
  const stored = { action: 'transfer', sourceStockId: 'source', destinationStockId: 'a', quantity: 2, reason: 'decant' };
  assert.equal(lifecycleRequestMatches(stored, stored), true);
  assert.equal(lifecycleRequestMatches(stored, { ...stored, destinationStockId: 'b' }), false);
});

test('transfer movements identify the opposite side of the pair', () => {
  assert.equal(oppositeTransferMovement('transfer_out'), 'transfer_in');
  assert.equal(oppositeTransferMovement('transfer_in'), 'transfer_out');
  assert.equal(oppositeTransferMovement('used'), null);
});

test('paired transfer validation rejects missing or mismatched ledger sides', () => {
  const out = { movementType: 'transfer_out', transferGroupId: 'group-1', quantityUsed: 2, quantityKg: 2, stockDelta: -2, gasType: 'R-410A', reversedAt: null };
  const incoming = { ...out, movementType: 'transfer_in', stockDelta: 2 };
  assert.equal(isValidTransferPair(out, incoming), true);
  assert.equal(isValidTransferPair(out, { ...incoming, quantityKg: 3 }), false);
  assert.equal(isValidTransferPair(out, { ...incoming, transferGroupId: 'group-2' }), false);
  assert.equal(isValidTransferPair(out, null), false);
});
