ALTER TABLE "inventory_items"
  ADD COLUMN "model" TEXT,
  ADD COLUMN "capacity" TEXT,
  ADD COLUMN "voltage" TEXT,
  ADD COLUMN "serial_number" TEXT;

ALTER TABLE "job_part_usages"
  ADD COLUMN "returned_at" TIMESTAMP(3);

CREATE TABLE "inventory_stock_alarms" (
  "id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "job_id" TEXT,
  "requested" DOUBLE PRECISION NOT NULL,
  "available" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "inventory_stock_alarms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_stock_alarms_status_created_at_idx"
  ON "inventory_stock_alarms"("status", "created_at");
CREATE INDEX "inventory_stock_alarms_item_id_status_idx"
  ON "inventory_stock_alarms"("item_id", "status");

ALTER TABLE "inventory_stock_alarms"
  ADD CONSTRAINT "inventory_stock_alarms_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_stock_alarms"
  ADD CONSTRAINT "inventory_stock_alarms_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
