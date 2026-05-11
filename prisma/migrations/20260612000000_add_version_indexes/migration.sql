-- Add version column to jobs for optimistic locking
-- Add missing indexes for performance
-- Extend AuditAction enum with new action types

-- ============================================
-- 1. Add version column to jobs
-- ============================================

ALTER TABLE "jobs" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 2. Add indexes on foreign key columns
-- ============================================

-- gas_usage indexes
CREATE INDEX IF NOT EXISTS "gas_usage_job_id_idx" ON "gas_usage"("job_id");
CREATE INDEX IF NOT EXISTS "gas_usage_stock_id_idx" ON "gas_usage"("stock_id");
CREATE INDEX IF NOT EXISTS "gas_usage_used_by_idx" ON "gas_usage"("used_by");

-- consumables: index on recordedBy
CREATE INDEX IF NOT EXISTS "consumables_recorded_by_idx" ON "consumables"("recorded_by");

-- Note: job_id index on consumables already exists (from earlier migration)

-- ============================================
-- 3. Extend AuditAction enum with new values
-- ============================================

-- PostgreSQL 10+ supports ADD VALUE IF NOT EXISTS; use safe pattern
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'adjust_stock') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'adjust_stock';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'create_customer') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'create_customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'update_customer') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'update_customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delete_customer') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'delete_customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'create_gas_stock') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'create_gas_stock';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'update_gas_stock') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'update_gas_stock';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delete_gas_stock') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'delete_gas_stock';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'create_consumable') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'create_consumable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delete_consumable') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'delete_consumable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'create_user') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'create_user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'update_user') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'update_user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delete_user') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'delete_user';
  END IF;
END $$;

-- ============================================
-- 4. (Optional) Check constraints for non-negative quantities
--    Uncomment after verifying no existing negative data
-- ============================================

-- ALTER TABLE "gas_stock" ADD CONSTRAINT "gas_stock_remaining_check" CHECK (remaining >= 0);
-- ALTER TABLE "gas_stock" ADD CONSTRAINT "gas_stock_quantity_check" CHECK (quantity >= 0);
-- ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_quantity_used_check" CHECK (quantityUsed >= 0);
-- ALTER TABLE "consumables" ADD CONSTRAINT "consumables_quantity_check" CHECK (quantity >= 0);
