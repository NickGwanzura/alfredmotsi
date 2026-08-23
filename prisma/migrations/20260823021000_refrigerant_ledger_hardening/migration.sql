ALTER TABLE "gas_stock"
  ADD COLUMN "serial_number" TEXT,
  ADD COLUMN "certification_expires_at" TIMESTAMP(3),
  ADD COLUMN "tare_weight_kg" DOUBLE PRECISION,
  ADD COLUMN "retired_at" TIMESTAMP(3);

ALTER TABLE "gas_usage"
  ADD COLUMN "reversed_by_name" TEXT,
  ADD COLUMN "client_request_id" TEXT,
  ADD COLUMN "stock_serial_number" TEXT;

UPDATE "gas_usage" gu
SET "stock_serial_number" = gs."serial_number"
FROM "gas_stock" gs
WHERE gu."stock_id" = gs."id" AND gs."serial_number" IS NOT NULL;

-- The three imported zero-value rows predate the ledger. Grandfather only those
-- immutable records so foreign-key maintenance (for example a user merge) can
-- still update attribution without weakening validation for new movements.
ALTER TABLE "gas_usage"
  DROP CONSTRAINT IF EXISTS "gas_usage_type_required",
  DROP CONSTRAINT IF EXISTS "gas_usage_quantity_positive",
  DROP CONSTRAINT IF EXISTS "gas_usage_quantity_kg_positive";

ALTER TABLE "gas_usage"
  ADD CONSTRAINT "gas_usage_type_required"
    CHECK ("created_at" < TIMESTAMP '2026-08-23 00:00:00' OR length(btrim("gas_type")) > 0) NOT VALID,
  ADD CONSTRAINT "gas_usage_quantity_positive"
    CHECK ("created_at" < TIMESTAMP '2026-08-23 00:00:00' OR "quantity_used" > 0) NOT VALID,
  ADD CONSTRAINT "gas_usage_quantity_kg_positive"
    CHECK ("created_at" < TIMESTAMP '2026-08-23 00:00:00' OR "quantity_kg" > 0) NOT VALID;

CREATE UNIQUE INDEX "gas_stock_serial_number_key" ON "gas_stock"("serial_number");
CREATE UNIQUE INDEX "gas_usage_client_request_id_key" ON "gas_usage"("client_request_id");
CREATE INDEX "gas_usage_job_id_created_at_idx" ON "gas_usage"("job_id", "created_at");
CREATE INDEX "gas_usage_stock_id_created_at_idx" ON "gas_usage"("stock_id", "created_at");

ALTER TABLE "gas_stock"
  ADD CONSTRAINT "gas_stock_tare_weight_valid"
  CHECK ("tare_weight_kg" IS NULL OR "tare_weight_kg" >= 0) NOT VALID;

-- Preserve the known zero-value legacy rows while enforcing semantic consistency
-- for every new ledger row.
ALTER TABLE "gas_usage"
  ADD CONSTRAINT "gas_usage_stock_delta_semantics"
  CHECK (
    "created_at" < TIMESTAMP '2026-08-23 00:00:00'
    OR ("movement_type" IN ('used', 'reused', 'disposed', 'lost', 'transfer_out') AND "stock_delta" < 0)
    OR ("movement_type" IN ('recovered', 'transfer_in') AND "stock_delta" > 0)
    OR ("movement_type" IN ('adjustment', 'reversal') AND "stock_delta" <> 0)
  ) NOT VALID,
  ADD CONSTRAINT "gas_usage_reversal_link_semantics"
  CHECK (("movement_type" = 'reversal') = ("reversal_of_id" IS NOT NULL)) NOT VALID,
  ADD CONSTRAINT "gas_usage_balance_nonnegative"
  CHECK ("stock_balance_after" IS NULL OR "stock_balance_after" >= 0) NOT VALID;
