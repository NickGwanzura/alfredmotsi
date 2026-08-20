-- Legacy imports allowed blank customer names. Backfill them once so every
-- downstream view, PDF, and email has a useful customer label.
UPDATE "customers"
SET "name" = CASE
  WHEN lower(split_part("email", '@', 1)) IN ('sales', 'info', 'purchasing', 'accounts', 'admin', 'support', 'contact')
    THEN initcap(replace(split_part(split_part("email", '@', 2), '.', 1), '-', ' '))
      || ' (' || initcap(replace(replace(replace(split_part("email", '@', 1), '.', ' '), '_', ' '), '-', ' ')) || ')'
  ELSE initcap(replace(replace(replace(split_part("email", '@', 1), '.', ' '), '_', ' '), '-', ' '))
END
WHERE btrim("name") = '';
