import test from 'node:test';
import assert from 'node:assert/strict';
import { canRecordGasForJobStatus, isActiveServiceMovement, isReversibleMovement } from './gasLedger';

test('only positive, unreversed service movements count toward ODS totals', () => {
  assert.equal(isActiveServiceMovement({ movementType: 'used', reversedAt: null, quantityKg: 1.2 }), true);
  assert.equal(isActiveServiceMovement({ movementType: 'recovered', reversedAt: null, quantityKg: 0.4 }), true);
  assert.equal(isActiveServiceMovement({ movementType: 'adjustment', reversedAt: null, quantityKg: 1 }), false);
  assert.equal(isActiveServiceMovement({ movementType: 'used', reversedAt: '2026-08-23', quantityKg: 1 }), false);
  assert.equal(isActiveServiceMovement({ movementType: 'used', reversedAt: null, quantityKg: 0 }), false);
});

test('legacy zero rows and reversal rows cannot be reversed', () => {
  assert.equal(isReversibleMovement({ movementType: 'used', reversedAt: null, quantityUsed: 1, quantityKg: 1, stockDelta: -1 }), true);
  assert.equal(isReversibleMovement({ movementType: 'reversal', reversedAt: null, quantityUsed: 1, quantityKg: 1, stockDelta: 1 }), false);
  assert.equal(isReversibleMovement({ movementType: 'used', reversedAt: null, quantityUsed: 0, quantityKg: 0, stockDelta: 0 }), false);
});

test('gas movements are blocked for pre-allocation and cancelled jobs', () => {
  assert.equal(canRecordGasForJobStatus('in-progress'), true);
  assert.equal(canRecordGasForJobStatus('completed'), true);
  assert.equal(canRecordGasForJobStatus('draft'), false);
  assert.equal(canRecordGasForJobStatus('unallocated'), false);
  assert.equal(canRecordGasForJobStatus('cancelled'), false);
});
