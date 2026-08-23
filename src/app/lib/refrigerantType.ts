export const REFRIGERANT_TYPE_MAP = {
  'R-32': 'R_32',
  'R-410A': 'R_410A',
  'R-22': 'R_22',
  'R-134a': 'R_134a',
  'R-407C': 'R_407C',
  'R-600A': 'R_600A',
  'R-290': 'R_290',
  'R-404A': 'R_404A',
  'R-507A': 'R_507A',
  'R-1234yf': 'R_1234yf',
  'R-438A': 'R_438A',
} as const;

export type RefrigerantLabel = keyof typeof REFRIGERANT_TYPE_MAP;
export type PrismaRefrigerantType = (typeof REFRIGERANT_TYPE_MAP)[RefrigerantLabel];

const REFRIGERANT_LABEL_BY_ENUM = Object.fromEntries(
  Object.entries(REFRIGERANT_TYPE_MAP).map(([label, value]) => [value, label]),
) as Record<PrismaRefrigerantType, RefrigerantLabel>;

export const REFRIGERANT_LABELS = Object.freeze(
  Object.keys(REFRIGERANT_TYPE_MAP) as RefrigerantLabel[],
);

/** Accepts either a user-facing label or Prisma enum key and returns the label stored in gas tables. */
export function toRefrigerantLabel(value: unknown): RefrigerantLabel | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized in REFRIGERANT_TYPE_MAP) return normalized as RefrigerantLabel;
  return REFRIGERANT_LABEL_BY_ENUM[normalized as PrismaRefrigerantType] ?? null;
}

/** Converts a user-facing label (or an already-normalized key) to the Prisma enum representation. */
export function toPrismaRefrigerantType(value: unknown): PrismaRefrigerantType | null {
  const label = toRefrigerantLabel(value);
  return label ? REFRIGERANT_TYPE_MAP[label] : null;
}

const SYSTEM_STATUS_TO_PRISMA = {
  optimal: 'optimal',
  'sub-optimal': 'sub_optimal',
  critical: 'critical',
} as const;

export type SystemStatusLabel = keyof typeof SYSTEM_STATUS_TO_PRISMA;
export type PrismaSystemStatus = (typeof SYSTEM_STATUS_TO_PRISMA)[SystemStatusLabel];

export function toPrismaSystemStatus(value: unknown): PrismaSystemStatus | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized === 'sub_optimal') return 'sub_optimal';
  return SYSTEM_STATUS_TO_PRISMA[normalized as SystemStatusLabel] ?? null;
}

export function toSystemStatusLabel(value: unknown): SystemStatusLabel | null {
  if (value === 'sub_optimal') return 'sub-optimal';
  if (value === 'optimal' || value === 'critical' || value === 'sub-optimal') return value;
  return null;
}
