'use client';

import { useSession } from './auth-provider';
import {
  canViewFinancials as checkCanViewFinancials,
  canViewReports as checkCanViewReports,
  canManageUsers as checkCanManageUsers,
  canManageCustomers as checkCanManageCustomers,
  canManageGasStock as checkCanManageGasStock,
  canManageGasUsage as checkCanManageGasUsage,
  canManageCRM as checkCanManageCRM,
  canManageJobs as checkCanManageJobs,
  canDeleteJobs as checkCanDeleteJobs,
  canViewAuditLog as checkCanViewAuditLog,
  canViewODSReport as checkCanViewODSReport,
  canViewAllJobs as checkCanViewAllJobs,
} from '@/app/lib/permissions';

export function usePermissions() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || '';

  return {
    role,
    isAdmin: role === 'admin',
    isTech: role === 'tech',
    isClient: role === 'client',
    canViewFinancials: checkCanViewFinancials(role),
    canViewReports: checkCanViewReports(role),
    canManageUsers: checkCanManageUsers(role),
    canManageCustomers: checkCanManageCustomers(role),
    canManageGasStock: checkCanManageGasStock(role),
    canManageGasUsage: checkCanManageGasUsage(role),
    canManageCRM: checkCanManageCRM(role),
    canManageJobs: checkCanManageJobs(role),
    canDeleteJobs: checkCanDeleteJobs(role),
    canViewAuditLog: checkCanViewAuditLog(role),
    canViewODSReport: checkCanViewODSReport(role),
    canViewAllJobs: checkCanViewAllJobs(role),
  };
}
