-- Migration 042: HOD (Head of Department) review module
-- HOD accounts get read-only access to filled checksheets across allowed
-- modules/sheets, and can mark each sheet as "Seen by HOD" with a remark.

-- 1. Register the HOD module so it appears in the Create-User module list.
INSERT INTO app_modules (code, name, color, route_prefix, is_active)
SELECT 'HOD', 'HOD Review', 'red', '/hod', true
WHERE NOT EXISTS (SELECT 1 FROM app_modules WHERE code = 'HOD');

-- 2. Per-HOD access scope.
--    allowed_scope = NULL  -> all modules/sheets allowed
--    allowed_scope = JSON  -> { "HSM_CHECKSHEETS": ["fm-daily-checklist", ...], ... }
CREATE TABLE IF NOT EXISTS hod_user_permissions (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  allowed_scope JSONB,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shared sign-off table keyed by (sheet_key, record_id) so no per-sheet
--    schema changes are needed to extend to more sheets/modules later.
CREATE TABLE IF NOT EXISTS hsm_hod_signoffs (
  id            SERIAL PRIMARY KEY,
  module_code   VARCHAR(40)  NOT NULL DEFAULT 'HSM_CHECKSHEETS',
  sheet_key     VARCHAR(60)  NOT NULL,
  record_id     INTEGER      NOT NULL,
  seen_by       INTEGER      REFERENCES users(id),
  seen_by_name  VARCHAR(150),
  seen_at       TIMESTAMPTZ  DEFAULT NOW(),
  remark        TEXT,
  UNIQUE (module_code, sheet_key, record_id)
);

CREATE INDEX IF NOT EXISTS idx_hod_signoffs_sheet
  ON hsm_hod_signoffs(module_code, sheet_key);
