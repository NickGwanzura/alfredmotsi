-- AlterEnum: add missing AuditAction values that exist in schema.prisma
-- but were never added via a migration. Safe no-ops on Postgres 12+ (IF NOT EXISTS).
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'password_change';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'failed_login';

-- CreateTable: company_profile (CompanyProfile model)
CREATE TABLE "company_profile" (
    "id"        TEXT         NOT NULL DEFAULT 'default',
    "name"      TEXT         NOT NULL DEFAULT 'Splash Air Conditioning',
    "address"   TEXT         NOT NULL DEFAULT '661 Lorraine Drive, Bluffhill, Harare',
    "phone"     TEXT         NOT NULL DEFAULT '0715212141 / 0773034528',
    "email"     TEXT,
    "website"   TEXT,
    "vatRate"   DOUBLE PRECISION NOT NULL DEFAULT 15.5,
    "vat_number" TEXT,
    "logo_url"  TEXT,
    "tagline"   TEXT,
    "services"  TEXT,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);
