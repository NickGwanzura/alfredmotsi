-- Service Operations OS extension. Existing records and legacy enum values are preserved.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'dispatcher';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'accounts';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'sales';

ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'dispatched';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'on-route';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'awaiting-parts';
ALTER TYPE "JobPriority" ADD VALUE IF NOT EXISTS 'emergency';
ALTER TYPE "JobPriority" ADD VALUE IF NOT EXISTS 'normal';

ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'phone';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'website';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'referral';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'google';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'walk-in';
ALTER TYPE "JobSource" ADD VALUE IF NOT EXISTS 'repeat';

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'partial';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'rejected';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_job';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_job';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'assign_technician';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'dispatch_job';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'cancel_job';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_lead';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_lead';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'convert_lead';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_quote';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'send_quote';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'view_quote';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'accept_quote';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'reject_quote';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_invoice';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'send_invoice';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'record_payment';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_contract';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_contract';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_site';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_equipment';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_checklist';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'use_job_part';

CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'quoted', 'booked', 'in-progress', 'won', 'lost');
CREATE TYPE "LeadSource" AS ENUM ('phone', 'whatsapp', 'website', 'referral', 'facebook', 'google', 'walk-in', 'repeat', 'other');
CREATE TYPE "QuoteTier" AS ENUM ('basic', 'standard', 'premium', 'custom');
CREATE TYPE "ChecklistResult" AS ENUM ('pending', 'pass', 'fail', 'not-applicable');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank-transfer', 'ecocash', 'card', 'velocity', 'other');
CREATE TYPE "ContractStatus" AS ENUM ('active', 'expiring-soon', 'expired', 'cancelled');
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'quarterly', 'biannual', 'annual', 'once-off');
CREATE TYPE "ReminderType" AS ENUM ('quote-follow-up', 'invoice-follow-up', 'inactive-lead', 'maintenance-due', 'custom');

ALTER TABLE "customers" ADD COLUMN "notes" TEXT;

CREATE TABLE "service_sites" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "contact_name" TEXT,
  "phone" TEXT,
  "access_notes" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_sites_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_sites_customer_id_idx" ON "service_sites"("customer_id");
ALTER TABLE "service_sites" ADD CONSTRAINT "service_sites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "equipment" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "unit_type" "UnitType" NOT NULL,
  "name" TEXT,
  "brand" TEXT,
  "model" TEXT,
  "serial_number" TEXT,
  "install_date" TEXT,
  "warranty_expiry" TEXT,
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_customer_id_idx" ON "equipment"("customer_id");
CREATE INDEX "equipment_site_id_idx" ON "equipment"("site_id");
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "service_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "leads" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "whatsapp" TEXT,
  "email" TEXT,
  "address" TEXT,
  "source" "LeadSource" NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'new',
  "service_type" TEXT,
  "description" TEXT NOT NULL,
  "priority" "JobPriority" NOT NULL DEFAULT 'normal',
  "next_follow_up" TEXT,
  "lost_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_customer_id_idx" ON "leads"("customer_id");
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD COLUMN "site_id" TEXT;
ALTER TABLE "jobs" ADD COLUMN "equipment_id" TEXT;
ALTER TABLE "jobs" ADD COLUMN "lead_id" TEXT;
ALTER TABLE "jobs" ADD COLUMN "duration_minutes" INTEGER NOT NULL DEFAULT 120;
CREATE UNIQUE INDEX "jobs_lead_id_key" ON "jobs"("lead_id");
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "service_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "reminders" (
  "id" TEXT NOT NULL,
  "type" "ReminderType" NOT NULL,
  "customer_id" TEXT,
  "lead_id" TEXT,
  "title" TEXT NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reminders_due_at_completed_idx" ON "reminders"("due_at", "completed");
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pricebook_items" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'each',
  "cost_price" DOUBLE PRECISION,
  "sell_price" DOUBLE PRECISION NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "inventory_item_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pricebook_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pricebook_items_code_key" ON "pricebook_items"("code");
CREATE UNIQUE INDEX "pricebook_items_inventory_item_id_key" ON "pricebook_items"("inventory_item_id");
CREATE INDEX "pricebook_items_category_idx" ON "pricebook_items"("category");
ALTER TABLE "pricebook_items" ADD CONSTRAINT "pricebook_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" ADD COLUMN "job_id" TEXT;
CREATE INDEX "inventory_movements_job_id_idx" ON "inventory_movements"("job_id");
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "job_part_usages" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit_cost" DOUBLE PRECISION,
  "unit_price" DOUBLE PRECISION,
  "notes" TEXT,
  "recorded_by" TEXT,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_part_usages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "job_part_usages_job_id_idx" ON "job_part_usages"("job_id");
CREATE INDEX "job_part_usages_item_id_idx" ON "job_part_usages"("item_id");
ALTER TABLE "job_part_usages" ADD CONSTRAINT "job_part_usages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_part_usages" ADD CONSTRAINT "job_part_usages_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotes" ADD COLUMN "job_id" TEXT;
ALTER TABLE "quotes" ADD COLUMN "lead_id" TEXT;
ALTER TABLE "quotes" ADD COLUMN "tier" "QuoteTier" NOT NULL DEFAULT 'custom';
ALTER TABLE "quotes" ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "terms" TEXT;
ALTER TABLE "quotes" ADD COLUMN "viewed_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "accepted_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_lines" ADD COLUMN "pricebook_item_id" TEXT;
ALTER TABLE "quote_lines" ADD COLUMN "category" TEXT DEFAULT 'service';
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_pricebook_item_id_fkey" FOREIGN KEY ("pricebook_item_id") REFERENCES "pricebook_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD COLUMN "quote_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "invoices" SET "balance" = CASE WHEN "status" = 'paid' THEN 0 ELSE "total" END;
CREATE UNIQUE INDEX "invoices_quote_id_key" ON "invoices"("quote_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_lines" ADD COLUMN "pricebook_item_id" TEXT;
ALTER TABLE "invoice_lines" ADD COLUMN "category" TEXT DEFAULT 'service';
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_pricebook_item_id_fkey" FOREIGN KEY ("pricebook_item_id") REFERENCES "pricebook_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recorded_by" TEXT,
  "receipt_ref" TEXT NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_receipt_ref_key" ON "payments"("receipt_ref");
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "checklist_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "job_type" "JobType",
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklist_templates_name_key" ON "checklist_templates"("name");

CREATE TABLE "checklist_template_items" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "requires_photo" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "checklist_template_items_template_id_sort_order_idx" ON "checklist_template_items"("template_id", "sort_order");
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_checklists" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "completed_at" TIMESTAMP(3),
  "completed_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_checklists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_checklists_job_id_template_id_key" ON "job_checklists"("job_id", "template_id");
ALTER TABLE "job_checklists" ADD CONSTRAINT "job_checklists_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_checklists" ADD CONSTRAINT "job_checklists_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "checklist_responses" (
  "id" TEXT NOT NULL,
  "job_checklist_id" TEXT NOT NULL,
  "template_item_id" TEXT NOT NULL,
  "result" "ChecklistResult" NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checklist_responses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklist_responses_job_checklist_id_template_item_id_key" ON "checklist_responses"("job_checklist_id", "template_item_id");
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_job_checklist_id_fkey" FOREIGN KEY ("job_checklist_id") REFERENCES "job_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "checklist_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "technician_availability" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technician_availability_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "technician_availability_user_id_date_start_time_end_time_key" ON "technician_availability"("user_id", "date", "start_time", "end_time");
CREATE INDEX "technician_availability_date_available_idx" ON "technician_availability"("date", "available");
ALTER TABLE "technician_availability" ADD CONSTRAINT "technician_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_events" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT,
  "customer_id" TEXT,
  "job_id" TEXT,
  "reference_id" TEXT,
  "provider" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payload" JSONB,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_events_event_created_at_idx" ON "notification_events"("event", "created_at");
CREATE INDEX "notification_events_job_id_idx" ON "notification_events"("job_id");
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "maintenance_contracts" (
  "id" TEXT NOT NULL,
  "contract_ref" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'active',
  "start_date" TEXT NOT NULL,
  "end_date" TEXT NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "visit_frequency_months" INTEGER NOT NULL,
  "agreed_amount" DOUBLE PRECISION NOT NULL,
  "next_service_date" TEXT NOT NULL,
  "notes" TEXT,
  "auto_create_jobs" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maintenance_contracts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "maintenance_contracts_contract_ref_key" ON "maintenance_contracts"("contract_ref");
CREATE INDEX "maintenance_contracts_status_end_date_idx" ON "maintenance_contracts"("status", "end_date");
CREATE INDEX "maintenance_contracts_next_service_date_idx" ON "maintenance_contracts"("next_service_date");
ALTER TABLE "maintenance_contracts" ADD CONSTRAINT "maintenance_contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_contracts" ADD CONSTRAINT "maintenance_contracts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "service_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "maintenance_contract_equipment" (
  "contract_id" TEXT NOT NULL,
  "equipment_id" TEXT NOT NULL,
  CONSTRAINT "maintenance_contract_equipment_pkey" PRIMARY KEY ("contract_id", "equipment_id")
);
ALTER TABLE "maintenance_contract_equipment" ADD CONSTRAINT "maintenance_contract_equipment_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "maintenance_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_contract_equipment" ADD CONSTRAINT "maintenance_contract_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
