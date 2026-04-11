/**
 * Bidirectional mapping between frontend Job types and Prisma enum keys.
 *
 * Prisma uses the *key* name (e.g. Split_System, in_progress) even when @map is
 * set, so we need to translate in both directions at the API boundary.
 */

const UNIT_MAP: Record<string, string> = {
  'Split System': 'Split_System',
  'Package Unit': 'Package_Unit',
  'Multi-Head': 'Multi_Head',
  'VRV/VRF': 'VRV_VRF',
  'Refrigeration System': 'Refrigeration_System',
  'Heat Pump': 'Heat_Pump',
  'Precision Cooling': 'Precision_Cooling',
};

const STATUS_MAP: Record<string, string> = {
  'in-progress': 'in_progress',
  'on-site': 'on_site',
  'pending-parts': 'pending_parts',
  'pending-booking': 'pending_booking',
};

// Reverse maps: Prisma key → frontend display value
const UNIT_RMAP = Object.fromEntries(Object.entries(UNIT_MAP).map(([k, v]) => [v, k]));
const STATUS_RMAP = Object.fromEntries(Object.entries(STATUS_MAP).map(([k, v]) => [v, k]));

/**
 * Convert a Prisma Job record (with relation includes) → frontend Job shape.
 * Translates enum keys back to display values and extracts techIds arrays.
 */
export function jobToClient(job: Record<string, unknown>): Record<string, unknown> {
  return {
    ...job,
    unitType: UNIT_RMAP[job.unitType as string] ?? job.unitType,
    status: STATUS_RMAP[job.status as string] ?? job.status,
    techIds: Array.isArray(job.technicians)
      ? (job.technicians as { id: string }[]).map((t) => t.id)
      : (job.techIds ?? []),
    coTechIds: Array.isArray(job.coTechnicians)
      ? (job.coTechnicians as { id: string }[]).map((t) => t.id)
      : (job.coTechIds ?? []),
  };
}

/**
 * Convert frontend request body → Prisma-safe scalar data.
 * Translates display values to Prisma enum keys.
 * Does NOT include relation fields — callers must handle those separately.
 */
export function jobFromClient(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  if (typeof out.unitType === 'string') out.unitType = UNIT_MAP[out.unitType] ?? out.unitType;
  if (typeof out.status === 'string') out.status = STATUS_MAP[out.status] ?? out.status;
  return out;
}
