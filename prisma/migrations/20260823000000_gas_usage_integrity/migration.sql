-- Preserve historical rows for an explicit audited cleanup while enforcing
-- integrity for every new or updated gas stock/usage row.
ALTER TABLE "gas_stock"
  ADD CONSTRAINT "gas_stock_type_required" CHECK (length(btrim("gas_type")) > 0) NOT VALID,
  ADD CONSTRAINT "gas_stock_quantity_positive" CHECK ("quantity" > 0) NOT VALID,
  ADD CONSTRAINT "gas_stock_remaining_valid" CHECK ("remaining" >= 0 AND "remaining" <= "quantity") NOT VALID;

ALTER TABLE "gas_usage"
  ADD CONSTRAINT "gas_usage_type_required" CHECK (length(btrim("gas_type")) > 0) NOT VALID,
  ADD CONSTRAINT "gas_usage_quantity_positive" CHECK ("quantity_used" > 0) NOT VALID;
