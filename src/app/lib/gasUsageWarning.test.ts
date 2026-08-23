import test from 'node:test';
import assert from 'node:assert/strict';
import { getGasUsageWarning } from './gasUsageWarning';

const job = { type: 'repair' as const, status: 'completed' as const, diagnostics: null };

test('reversed, adjustment, and legacy zero rows do not suppress a missing-gas warning', () => {
  const warning = getGasUsageWarning(job, [
    { jobId: 'job-1', movementType: 'adjustment', reversedAt: null, quantityKg: 2 },
    { jobId: 'job-1', movementType: 'used', reversedAt: '2026-08-23', quantityKg: 1 },
    { jobId: 'job-1', movementType: 'used', reversedAt: null, quantityKg: 0 },
  ], 'job-1');
  assert.equal(warning?.level, 'overdue');
});

test('a positive active service movement suppresses the warning', () => {
  const warning = getGasUsageWarning(job, [
    { jobId: 'job-1', movementType: 'used', reversedAt: null, quantityKg: 0.5 },
  ], 'job-1');
  assert.equal(warning, null);
});
