-- Persist uploaded job evidence without requiring external object storage.
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

CREATE INDEX "job_attachments_job_id_uploaded_at_idx" ON "job_attachments"("job_id", "uploaded_at");
CREATE INDEX "job_attachments_uploaded_by_idx" ON "job_attachments"("uploaded_by");

ALTER TABLE "job_attachments"
  ADD CONSTRAINT "job_attachments_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_attachments"
  ADD CONSTRAINT "job_attachments_uploaded_by_fkey"
  FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_attachments"
  ADD CONSTRAINT "job_attachments_has_payload_check"
  CHECK ("data_url" IS NOT NULL OR "url" IS NOT NULL);
