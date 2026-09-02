ALTER TABLE "customers" ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE INDEX "customers_archived_at_idx" ON "customers"("archived_at");
