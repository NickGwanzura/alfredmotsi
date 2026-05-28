-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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

-- CreateIndex
CREATE INDEX "email_delivery_logs_created_at_idx" ON "email_delivery_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_delivery_logs_status_created_at_idx" ON "email_delivery_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "email_delivery_logs_category_created_at_idx" ON "email_delivery_logs"("category", "created_at");

-- CreateIndex
CREATE INDEX "email_delivery_logs_recipient_created_at_idx" ON "email_delivery_logs"("recipient", "created_at");
