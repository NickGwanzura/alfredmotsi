-- AlterEnum: add new AuditAction values
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'allocate_fund';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_fund';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'close_fund';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'record_expense';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_expense';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'delete_expense';

-- AlterTable: add name to fund_allocations
ALTER TABLE "fund_allocations" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- AlterTable: add receipt_data_url to fund_expenses
ALTER TABLE "fund_expenses" ADD COLUMN IF NOT EXISTS "receipt_data_url" TEXT;
