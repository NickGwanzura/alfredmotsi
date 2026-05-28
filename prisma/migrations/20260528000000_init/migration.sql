-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'tech', 'client');

-- CreateEnum
CREATE TYPE "TechStatus" AS ENUM ('available', 'on-site', 'in-transit');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('installation', 'maintenance', 'repair', 'sales', 'inspection', 'callout');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('scheduled', 'in-progress', 'on-site', 'completed', 'cancelled', 'pending-parts', 'unallocated', 'pending-booking');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('urgent', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('install', 'repair', 'service', 'quote');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('Split System', 'Ducted', 'Package Unit', 'Multi-Head', 'Cassette', 'VRV/VRF', 'Refrigeration System', 'Chiller', 'Heat Pump', 'Precision Cooling');

-- CreateEnum
CREATE TYPE "RefrigerantType" AS ENUM ('R-32', 'R-410A', 'R-22', 'R-134a', 'R-407C', 'R-600A', 'R-290');

-- CreateEnum
CREATE TYPE "SystemStatus" AS ENUM ('optimal', 'sub-optimal', 'critical');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('HIGH_CURRENT', 'LOW_VOLTAGE', 'HIGH_TEMP', 'PRESSURE_LEAK');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('admin', 'portal');

-- CreateEnum
CREATE TYPE "CRMType" AS ENUM ('call', 'visit', 'complaint', 'email', 'quote');

-- CreateEnum
CREATE TYPE "CRMOutcome" AS ENUM ('positive', 'negative', 'pending', 'resolved');

-- CreateEnum
CREATE TYPE "ConsumableType" AS ENUM ('gas', 'compressor', 'part', 'other');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('login', 'view_job', 'edit_job', 'complete_job', 'delete_job', 'adjust_stock', 'create_customer', 'update_customer', 'delete_customer', 'create_gas_stock', 'update_gas_stock', 'delete_gas_stock', 'create_consumable', 'delete_consumable', 'create_user', 'update_user', 'delete_user');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL,
    "password" TEXT NOT NULL,
    "password_changed" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "specialty" TEXT,
    "status" "TechStatus",
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "site_address" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT NOT NULL,
    "portal_code" TEXT,
    "portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "source" "JobSource" NOT NULL,
    "customer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "unit_type" "UnitType" NOT NULL,
    "issue" "IssueType" NOT NULL,
    "priority" "JobPriority" NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "clock_in" TEXT,
    "clock_out" TEXT,
    "description" TEXT NOT NULL,
    "photos" TEXT[],
    "signature" TEXT,
    "job_card_ref" TEXT NOT NULL,
    "alerts" "AlertType"[],
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostics" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "voltage" TEXT,
    "current" TEXT,
    "avg_temp" TEXT,
    "max_temp" TEXT,
    "suction" TEXT,
    "discharge" TEXT,
    "refrigerant_type" "RefrigerantType",
    "refrigerant_recovered" DOUBLE PRECISION,
    "refrigerant_used" DOUBLE PRECISION,
    "refrigerant_reused" DOUBLE PRECISION,
    "status" "SystemStatus",
    "notes" TEXT,
    "delta_t" TEXT,
    "brand" TEXT,
    "serial" TEXT,

    CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_entries" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_schedules" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "interval" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'months',

    CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_stock" (
    "id" TEXT NOT NULL,
    "gas_type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "supplier_ref" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gas_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_usage" (
    "id" TEXT NOT NULL,
    "stock_id" TEXT,
    "gas_type" TEXT NOT NULL,
    "quantity_used" DOUBLE PRECISION NOT NULL,
    "used_by" TEXT,
    "job_id" TEXT,
    "customer" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_records" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "CRMType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "follow_up" TEXT,
    "follow_up_done" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "CRMOutcome" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumables" (
    "id" TEXT NOT NULL,
    "job_id" TEXT,
    "type" "ConsumableType" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "recorded_by" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_attachments" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER,
    "data_url" TEXT,
    "url" TEXT,
    "note" TEXT,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "job_id" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "category" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL,
    "resend_message_id" TEXT,
    "resend_data" JSONB,
    "resend_error" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssignedJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CoAssignedJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_portal_code_key" ON "customers"("portal_code");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_job_card_ref_key" ON "jobs"("job_card_ref");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostics_job_id_key" ON "diagnostics"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_schedules_job_id_key" ON "recurring_schedules"("job_id");

-- CreateIndex
CREATE INDEX "gas_usage_job_id_idx" ON "gas_usage"("job_id");

-- CreateIndex
CREATE INDEX "gas_usage_stock_id_idx" ON "gas_usage"("stock_id");

-- CreateIndex
CREATE INDEX "gas_usage_used_by_idx" ON "gas_usage"("used_by");

-- CreateIndex
CREATE INDEX "consumables_job_id_idx" ON "consumables"("job_id");

-- CreateIndex
CREATE INDEX "consumables_recorded_by_idx" ON "consumables"("recorded_by");

-- CreateIndex
CREATE INDEX "job_attachments_job_id_uploaded_at_idx" ON "job_attachments"("job_id", "uploaded_at");

-- CreateIndex
CREATE INDEX "job_attachments_uploaded_by_idx" ON "job_attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_job_id_idx" ON "audit_logs"("job_id");

-- CreateIndex
CREATE INDEX "email_delivery_logs_created_at_idx" ON "email_delivery_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_delivery_logs_status_created_at_idx" ON "email_delivery_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "email_delivery_logs_category_created_at_idx" ON "email_delivery_logs"("category", "created_at");

-- CreateIndex
CREATE INDEX "email_delivery_logs_recipient_created_at_idx" ON "email_delivery_logs"("recipient", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_AssignedJobs_AB_unique" ON "_AssignedJobs"("A", "B");

-- CreateIndex
CREATE INDEX "_AssignedJobs_B_index" ON "_AssignedJobs"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CoAssignedJobs_AB_unique" ON "_CoAssignedJobs"("A", "B");

-- CreateIndex
CREATE INDEX "_CoAssignedJobs_B_index" ON "_CoAssignedJobs"("B");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "gas_stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_records" ADD CONSTRAINT "crm_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_records" ADD CONSTRAINT "crm_records_by_fkey" FOREIGN KEY ("by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedJobs" ADD CONSTRAINT "_AssignedJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedJobs" ADD CONSTRAINT "_AssignedJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoAssignedJobs" ADD CONSTRAINT "_CoAssignedJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoAssignedJobs" ADD CONSTRAINT "_CoAssignedJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

