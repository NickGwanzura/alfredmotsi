import type { GasUsageRecord, JobStatus, RefrigerantMovementType } from '@/app/types';

const SERVICE_MOVEMENTS = new Set<RefrigerantMovementType>(['used', 'recovered', 'reused']);
const LOGGABLE_JOB_STATUSES = new Set<JobStatus>(['scheduled', 'dispatched', 'on-route', 'in-progress', 'on-site', 'awaiting-parts', 'pending-parts', 'completed']);

export function isActiveServiceMovement(record: Pick<GasUsageRecord, 'movementType' | 'reversedAt' | 'quantityKg'>): boolean {
  return !record.reversedAt && SERVICE_MOVEMENTS.has(record.movementType)
    && Number.isFinite(record.quantityKg) && record.quantityKg > 0;
}

export function isReversibleMovement(record: Pick<GasUsageRecord, 'movementType' | 'reversedAt' | 'quantityUsed' | 'quantityKg' | 'stockDelta'>): boolean {
  return !record.reversedAt && record.movementType !== 'reversal'
    && Number.isFinite(record.quantityUsed) && record.quantityUsed > 0
    && Number.isFinite(record.quantityKg) && record.quantityKg > 0
    && Number.isFinite(record.stockDelta) && record.stockDelta !== 0;
}

export function canRecordGasForJobStatus(status: JobStatus): boolean {
  return LOGGABLE_JOB_STATUSES.has(status);
}
