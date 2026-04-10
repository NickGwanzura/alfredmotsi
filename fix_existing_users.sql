-- Set password_changed = true for all existing users
-- so only NEW invited users will need to change password
UPDATE "users" SET "password_changed" = true;
