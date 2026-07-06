export type UserRole = 'admin' | 'tech' | 'client';

const FINANCIAL_ROLES: Set<UserRole> = new Set(['admin']);
const ADMIN_ROLES: Set<UserRole> = new Set(['admin']);
const TECH_MANAGE_ROLES: Set<UserRole> = new Set(['admin', 'tech']);

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
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

export function canManageGasStock(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

export function canManageGasUsage(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
}

export function canManageCRM(role: string): boolean {
  return TECH_MANAGE_ROLES.has(role as UserRole);
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
  return ADMIN_ROLES.has(role as UserRole);
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
  return role === 'admin';
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
