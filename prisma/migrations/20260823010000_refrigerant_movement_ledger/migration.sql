CREATE TYPE "GasStockKind" AS ENUM ('virgin', 'recovered', 'waste');
CREATE TYPE "RefrigerantMovementType" AS ENUM ('used', 'recovered', 'reused', 'adjustment', 'reversal');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_gas_movement';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'reverse_gas_movement';

ALTER TABLE "gas_stock"
  ADD COLUMN "stock_kind" "GasStockKind" NOT NULL DEFAULT 'virgin',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "gas_usage"
  ADD COLUMN "movement_type" "RefrigerantMovementType" NOT NULL DEFAULT 'used',
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'kg',
  ADD COLUMN "quantity_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "stock_delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "stock_balance_after" DOUBLE PRECISION,
  ADD COLUMN "used_by_name" TEXT NOT NULL DEFAULT 'Unknown',
  ADD COLUMN "reversal_of_id" TEXT,
  ADD COLUMN "reversed_at" TIMESTAMP(3),
  ADD COLUMN "reversed_by" TEXT,
  ADD COLUMN "reversal_reason" TEXT;

UPDATE "gas_usage" gu
SET
  "unit" = COALESCE(NULLIF(lower(gs."unit"), ''), 'kg'),
  "quantity_kg" = CASE COALESCE(NULLIF(lower(gs."unit"), ''), 'kg')
    WHEN 'g' THEN gu."quantity_used" / 1000.0
    WHEN 'lb' THEN gu."quantity_used" * 0.45359237
    ELSE gu."quantity_used"
  END,
  "stock_delta" = -gu."quantity_used"
FROM "gas_stock" gs
WHERE gu."stock_id" = gs."id";

UPDATE "gas_usage" gu
SET "used_by_name" = COALESCE(NULLIF(u."name", ''), 'Unknown')
FROM "users" u
WHERE gu."used_by" = u."id" AND gu."used_by_name" = 'Unknown';

CREATE UNIQUE INDEX "gas_usage_reversal_of_id_key" ON "gas_usage"("reversal_of_id");
CREATE INDEX "gas_usage_movement_type_created_at_idx" ON "gas_usage"("movement_type", "created_at");
CREATE INDEX "gas_usage_created_at_idx" ON "gas_usage"("created_at");

ALTER TABLE "gas_usage"
  ADD CONSTRAINT "gas_usage_reversal_of_id_fkey"
  FOREIGN KEY ("reversal_of_id") REFERENCES "gas_usage"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "gas_usage_unit_supported" CHECK ("unit" IN ('kg', 'g', 'lb')) NOT VALID,
  ADD CONSTRAINT "gas_usage_quantity_kg_positive" CHECK ("quantity_kg" > 0) NOT VALID;

ALTER TABLE "gas_stock"
  ADD CONSTRAINT "gas_stock_unit_supported" CHECK ("unit" IN ('kg', 'g', 'lb')) NOT VALID;
