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

const UNIT_RMAP = Object.fromEntries(Object.entries(UNIT_MAP).map(([k, v]) => [v, k]));
const STATUS_RMAP = Object.fromEntries(Object.entries(STATUS_MAP).map(([k, v]) => [v, k]));

export const FINANCIAL_JOB_FIELDS = [
  'price', 'cost', 'total', 'subtotal', 'tax',
  'invoiceAmount', 'paymentAmount', 'revenue', 'profit',
  'contractValue', 'quoteAmount', 'labourCost', 'partsCost',
  'discount', 'deposit', 'balance',
];

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

export function stripJobFinancialFields<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of FINANCIAL_JOB_FIELDS) {
    delete result[field];
  }
  const diagnostics = (data as Record<string, unknown>).diagnostics;
  if (diagnostics && typeof diagnostics === 'object') {
    const cleanDiag = { ...(diagnostics as Record<string, unknown>) };
    for (const field of FINANCIAL_JOB_FIELDS) {
      delete (cleanDiag as Record<string, unknown>)[field];
    }
    (result as Record<string, unknown>).diagnostics = cleanDiag;
  }
  return result;
}

export function jobFromClient(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  if (typeof out.unitType === 'string') out.unitType = UNIT_MAP[out.unitType] ?? out.unitType;
  if (typeof out.status === 'string') out.status = STATUS_MAP[out.status] ?? out.status;
  return out;
}
