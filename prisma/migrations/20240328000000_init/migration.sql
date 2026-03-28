-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "UserRole" AS ENUM ('admin', 'tech', 'client');
CREATE TYPE "TechStatus" AS ENUM ('available', 'on-site', 'in-transit');
CREATE TYPE "JobType" AS ENUM ('installation', 'maintenance', 'repair', 'sales', 'inspection', 'callout');
CREATE TYPE "JobStatus" AS ENUM ('scheduled', 'in-progress', 'on-site', 'completed', 'cancelled', 'pending-parts', 'unallocated', 'pending-booking');
CREATE TYPE "JobPriority" AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE "IssueType" AS ENUM ('install', 'repair', 'service', 'quote');
CREATE TYPE "UnitType" AS ENUM ('Split System', 'Ducted', 'Package Unit', 'Multi-Head', 'Cassette', 'VRV/VRF', 'Refrigeration System', 'Chiller', 'Heat Pump', 'Precision Cooling');
CREATE TYPE "RefrigerantType" AS ENUM ('R-32', 'R-410A', 'R-22', 'R-134a', 'R-407C', 'R-600A', 'R-290');
CREATE TYPE "SystemStatus" AS ENUM ('optimal', 'sub-optimal', 'critical');
CREATE TYPE "AlertType" AS ENUM ('HIGH_CURRENT', 'LOW_VOLTAGE', 'HIGH_TEMP', 'PRESSURE_LEAK');
CREATE TYPE "JobSource" AS ENUM ('admin', 'portal');
CREATE TYPE "CRMType" AS ENUM ('call', 'visit', 'complaint', 'email', 'quote');
CREATE TYPE "CRMOutcome" AS ENUM ('positive', 'negative', 'pending', 'resolved');

-- ============================================
-- AUTH TABLES (NextAuth.js)
-- ============================================

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

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- ============================================
-- USER TABLE
-- ============================================

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "specialty" TEXT,
    "status" "TechStatus",
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CORE APP TABLES
-- ============================================

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "history_entries" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_schedules" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "interval" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'months',

    CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "gas_usage" (
    "id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "gas_type" TEXT NOT NULL,
    "quantity_used" DOUBLE PRECISION NOT NULL,
    "used_by" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_usage_pkey" PRIMARY KEY ("id")
);

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

-- Join tables for many-to-many relationships
CREATE TABLE "_AssignedJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE TABLE "_CoAssignedJobs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- ============================================
-- UNIQUE INDEXES
-- ============================================

CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "customers_portal_code_key" ON "customers"("portal_code");
CREATE UNIQUE INDEX "jobs_job_card_ref_key" ON "jobs"("job_card_ref");
CREATE UNIQUE INDEX "diagnostics_job_id_key" ON "diagnostics"("job_id");
CREATE UNIQUE INDEX "recurring_schedules_job_id_key" ON "recurring_schedules"("job_id");
CREATE UNIQUE INDEX "_AssignedJobs_AB_unique" ON "_AssignedJobs"("A", "B");
CREATE INDEX "_AssignedJobs_B_index" ON "_AssignedJobs"("B");
CREATE UNIQUE INDEX "_CoAssignedJobs_AB_unique" ON "_CoAssignedJobs"("A", "B");
CREATE INDEX "_CoAssignedJobs_B_index" ON "_CoAssignedJobs"("B");

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "gas_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gas_usage" ADD CONSTRAINT "gas_usage_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_records" ADD CONSTRAINT "crm_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_records" ADD CONSTRAINT "crm_records_by_fkey" FOREIGN KEY ("by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AssignedJobs" ADD CONSTRAINT "_AssignedJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AssignedJobs" ADD CONSTRAINT "_AssignedJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CoAssignedJobs" ADD CONSTRAINT "_CoAssignedJobs_A_fkey" FOREIGN KEY ("A") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CoAssignedJobs" ADD CONSTRAINT "_CoAssignedJobs_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
