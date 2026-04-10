-- Set password_changed = true for all existing users
UPDATE "users" SET "password_changed" = true;
