-- Fix cascade delete behavior to SET NULL to preserve history
-- Changes:
--  - Make FK columns nullable where users/gas_stock/jobs can be deleted
--  - Drop existing FK constraints and recreate with ON DELETE SET NULL

-- ============================================
-- 1. Alter columns to be nullable (required before SET NULL FK)
-- ============================================

-- gas_usage: stock_id, used_by, job_id
ALTER TABLE "gas_usage" ALTER COLUMN "stock_id" DROP NOT NULL;
ALTER TABLE "gas_usage" ALTER COLUMN "used_by" DROP NOT NULL;
ALTER TABLE "gas_usage" ALTER COLUMN "job_id" DROP NOT NULL;

-- consumables: job_id, recorded_by
ALTER TABLE "consumables" ALTER COLUMN "job_id" DROP NOT NULL;
ALTER TABLE "consumables" ALTER COLUMN "recorded_by" DROP NOT NULL;

-- audit_logs: user_id (job_id already nullable)
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;

-- ============================================
-- 2. Drop existing foreign key constraints
-- ============================================

ALTER TABLE "gas_usage" DROP CONSTRAINT "gas_usage_used_by_fkey";
ALTER TABLE "gas_usage" DROP CONSTRAINT "gas_usage_job_id_fkey";
ALTER TABLE "gas_usage" DROP CONSTRAINT "gas_usage_stock_id_fkey";

ALTER TABLE "consumables" DROP CONSTRAINT "consumables_recorded_by_fkey";
ALTER TABLE "consumables" DROP CONSTRAINT "consumables_job_id_fkey";

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";
-- audit_logs.job_id constraint already SET NULL from earlier migration

-- ============================================
-- 3. Re-create foreign keys with ON DELETE SET NULL
-- ============================================

ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_used_by_fkey"
  FOREIGN KEY ("used_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "gas_stock"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consumables" ADD CONSTRAINT "consumables_recorded_by_fkey"
  FOREIGN KEY ("recorded_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consumables" ADD CONSTRAINT "consumables_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- job_id already SET NULL as of 20260417000000_add_delete_job_audit_reason
