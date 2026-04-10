-- Add password_changed column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed" BOOLEAN NOT NULL DEFAULT false;
