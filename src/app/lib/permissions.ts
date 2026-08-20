export type UserRole = 'owner' | 'admin' | 'dispatcher' | 'accounts' | 'sales' | 'tech' | 'client';

const FINANCIAL_ROLES: Set<UserRole> = new Set(['owner', 'admin', 'accounts']);
const ADMIN_ROLES: Set<UserRole> = new Set(['owner', 'admin']);
const OPERATIONS_ROLES: Set<UserRole> = new Set(['owner', 'admin', 'dispatcher']);
const CUSTOMER_ROLES: Set<UserRole> = new Set(['owner', 'admin', 'dispatcher', 'sales', 'tech']);
const TECH_MANAGE_ROLES: Set<UserRole> = new Set(['owner', 'admin', 'dispatcher', 'tech']);
const STAFF_ROLES: Set<UserRole> = new Set(['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech']);

export function canViewFinancials(role: string): boolean {
  return FINANCIAL_ROLES.has(role as UserRole);
}

export function canViewReports(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function canManageUsers(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function canManageCustomers(role: string): boolean {
  return CUSTOMER_ROLES.has(role as UserRole);
}

export function canManageGasStock(role: string): boolean {
  return STAFF_ROLES.has(role as UserRole);
}

export function canManageGasUsage(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

/** Roles that can create inventory items and record stock movements. */
export function canManageInventory(role: string): boolean {
  return ['owner', 'admin', 'dispatcher', 'accounts'].includes(role);
}

export function canManageCRM(role: string): boolean {
  return CUSTOMER_ROLES.has(role as UserRole);
}

export function canManageJobs(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

export function canDeleteJobs(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function canViewAuditLog(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function canViewODSReport(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

export function canViewAllJobs(role: string): boolean {
  return OPERATIONS_ROLES.has(role as UserRole) || FINANCIAL_ROLES.has(role as UserRole) || role === 'sales';
}

export function canExportData(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function canGeneratePDF(role: string): boolean {
  return true;
}

export function canViewOwnJobs(role: string): boolean {
  return role === 'tech';
}

export function canManageFunds(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function canViewFunds(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.has(role as UserRole);
}

export function isTech(role: string): boolean {
  return role === 'tech';
}

export function isClient(role: string): boolean {
  return role === 'client';
}

export function requireRole(role: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role as UserRole);
}

export const FINANCIAL_FIELDS = [
  'price',
  'cost',
  'total',
  'subtotal',
  'tax',
  'invoiceAmount',
  'paymentAmount',
  'revenue',
  'profit',
  'contractValue',
  'quoteAmount',
  'labourCost',
  'partsCost',
  'discount',
  'deposit',
  'balance',
] as const;

export function stripFinancialFields<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of FINANCIAL_FIELDS) {
    delete result[field];
  }
  return result;
}

export function getFinancialFields(): readonly string[] {
  return FINANCIAL_FIELDS;
}
