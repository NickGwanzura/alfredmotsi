-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('active', 'exhausted', 'closed');

-- CreateTable: fund_allocations
CREATE TABLE "fund_allocations" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FundStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "tech_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fund_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fund_expenses
CREATE TABLE "fund_expenses" (
    "id" TEXT NOT NULL,
    "fund_id" TEXT NOT NULL,
    "job_id" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receipt_ref" TEXT,
    "notes" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fund_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "fund_expenses_fund_id_idx" ON "fund_expenses"("fund_id");
CREATE INDEX "fund_expenses_job_id_idx" ON "fund_expenses"("job_id");

-- AddForeignKeys
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fund_expenses" ADD CONSTRAINT "fund_expenses_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "fund_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fund_expenses" ADD CONSTRAINT "fund_expenses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fund_expenses" ADD CONSTRAINT "fund_expenses_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
