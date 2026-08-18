-- The service operations migration adds JobPriority.normal. Set it as the
-- default after that enum value has been committed by PostgreSQL.
ALTER TABLE "leads" ALTER COLUMN "priority" SET DEFAULT 'normal';
