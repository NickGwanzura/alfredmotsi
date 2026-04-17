import { Job, GasUsageRecord, JobType, JobStatus } from '@/app/types';

/** Job types that commonly involve refrigerant work. */
const GAS_RELEVANT_TYPES: JobType[] = ['installation', 'maintenance', 'repair'];

/** Statuses where gas logging is expected or overdue. */
const LOGGABLE_STATUSES: JobStatus[] = ['in-progress', 'on-site', 'completed'];

export type GasWarningLevel = 'reminder' | 'overdue';

export interface GasUsageWarning {
  level: GasWarningLevel;
  message: string;
}

/**
 * Returns a warning if a job probably needs refrigerant logging but none is recorded.
 * Heuristics only — jobs that actually used zero refrigerant can ignore the warning.
 *
 * - `overdue`: job is completed and has no gas usage logged.
 * - `reminder`: job is in-progress / on-site and has no gas usage logged yet.
 */
export function getGasUsageWarning(
  job: Pick<Job, 'type' | 'status' | 'diagnostics'>,
  gasUsage: Pick<GasUsageRecord, 'jobId'>[],
  jobId: string
): GasUsageWarning | null {
  if (!GAS_RELEVANT_TYPES.includes(job.type)) return null;
  if (!LOGGABLE_STATUSES.includes(job.status)) return null;

  const hasGasRecord = gasUsage.some(g => g.jobId === jobId);
  if (hasGasRecord) return null;

  // If diagnostics already captured refrigerant use, trust that and skip warning
  const diag = job.diagnostics;
  if (diag && (diag.refrigerantUsed || diag.refrigerantRecovered || diag.refrigerantReused)) {
    return null;
  }

  if (job.status === 'completed') {
    return {
      level: 'overdue',
      message: 'This job was completed without logging refrigerant usage. If gas was used, please record it now from the ODS tab.',
    };
  }

  return {
    level: 'reminder',
    message: 'Remember to log any refrigerant used on this job from the ODS tab before marking it complete.',
  };
}
