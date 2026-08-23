-- Pair cylinder transfers explicitly and persist lifecycle idempotency separately
-- from material ledger rows (retirement has no quantity movement of its own).
ALTER TABLE "gas_usage"
  ADD COLUMN "transfer_group_id" TEXT;

CREATE INDEX "gas_usage_transfer_group_id_idx" ON "gas_usage"("transfer_group_id");

CREATE TABLE "gas_lifecycle_requests" (
  "id" TEXT NOT NULL,
  "client_request_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "source_stock_id" TEXT NOT NULL,
  "destination_stock_id" TEXT,
  "quantity" DOUBLE PRECISION,
  "reason" TEXT NOT NULL,
  "movement_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gas_lifecycle_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gas_lifecycle_requests_action_valid" CHECK ("action" IN ('lost', 'disposed', 'transfer', 'retire')),
  CONSTRAINT "gas_lifecycle_requests_shape_valid" CHECK (
    ("action" = 'retire' AND "quantity" IS NULL AND "destination_stock_id" IS NULL)
    OR ("action" IN ('lost', 'disposed') AND "quantity" > 0 AND "destination_stock_id" IS NULL)
    OR ("action" = 'transfer' AND "quantity" > 0 AND "destination_stock_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "gas_lifecycle_requests_client_request_id_key"
  ON "gas_lifecycle_requests"("client_request_id");
CREATE INDEX "gas_lifecycle_requests_source_stock_id_created_at_idx"
  ON "gas_lifecycle_requests"("source_stock_id", "created_at");

-- Preserve recorded inventory while repairing imported rows whose capacity was
-- lower than their recorded balance. Physical serials are intentionally not
-- fabricated; those rows remain quarantined by the application until verified.
UPDATE "gas_stock"
SET "quantity" = "remaining", "version" = "version" + 1, "updated_at" = NOW()
WHERE "remaining" > "quantity";

-- Three imported cylinders predate physical identity capture. Keep them visibly
-- quarantined without inventing a refrigerant or serial number, while requiring
-- both fields for every cylinder created or updated by the hardened system.
ALTER TABLE "gas_stock" DROP CONSTRAINT IF EXISTS "gas_stock_type_required";
ALTER TABLE "gas_stock"
  ADD CONSTRAINT "gas_stock_type_required"
    CHECK ("created_at" < TIMESTAMP '2026-08-23 00:00:00' OR length(btrim("gas_type")) > 0) NOT VALID,
  ADD CONSTRAINT "gas_stock_serial_required"
    CHECK ("created_at" < TIMESTAMP '2026-08-23 00:00:00' OR length(btrim("serial_number")) > 0) NOT VALID;

-- A cylinder with movement history must never be detached from that history.
ALTER TABLE "gas_usage" DROP CONSTRAINT IF EXISTS "gas_usage_stock_id_fkey";
ALTER TABLE "gas_usage"
  ADD CONSTRAINT "gas_usage_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "gas_stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gas_stock"
  ADD CONSTRAINT "gas_stock_retired_empty"
  CHECK ("retired_at" IS NULL OR "remaining" = 0) NOT VALID;

ALTER TABLE "gas_usage"
  ADD CONSTRAINT "gas_usage_transfer_group_required"
  CHECK ("movement_type" NOT IN ('transfer_out', 'transfer_in') OR "transfer_group_id" IS NOT NULL) NOT VALID;

-- The prior migrations used NOT VALID to protect imported rows during rollout.
-- Their grandfather clauses now make the historical rows valid, so finish the
-- rollout by validating every ledger constraint after the capacity repair above.
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_type_required";
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_quantity_positive";
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_remaining_valid";
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_unit_supported";
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_tare_weight_valid";
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_retired_empty";
ALTER TABLE "gas_stock" VALIDATE CONSTRAINT "gas_stock_serial_required";

ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_type_required";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_quantity_positive";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_quantity_kg_positive";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_unit_supported";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_stock_delta_semantics";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_reversal_link_semantics";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_balance_nonnegative";
ALTER TABLE "gas_usage" VALIDATE CONSTRAINT "gas_usage_transfer_group_required";
