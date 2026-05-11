-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'delete_job';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "reason" TEXT;
