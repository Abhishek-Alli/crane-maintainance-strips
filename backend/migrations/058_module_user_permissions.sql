-- Migration 058: per-user sheet permissions for HSM, PTM, SMS modules
-- Mirrors the existing hbm_user_permissions table structure

CREATE TABLE IF NOT EXISTS hsm_user_permissions (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  allowed_checksheets JSONB   DEFAULT NULL,
  can_download_pdf   BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete         BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ptm_user_permissions (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  allowed_checksheets JSONB   DEFAULT NULL,
  can_download_pdf   BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete         BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_user_permissions (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  allowed_checksheets JSONB   DEFAULT NULL,
  can_download_pdf   BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete         BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed HSM sheet keys into app_permission_lists if not already present
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
VALUES
  ('HSM_CHECKSHEETS', 'breakdown-analysis',          'Breakdown Analysis Report',    1),
  ('HSM_CHECKSHEETS', 'roll-change-activity',         'Roll Change Activity',         2),
  ('HSM_CHECKSHEETS', 'delay-report',                 'Delay Report',                 3),
  ('HSM_CHECKSHEETS', 'fm-daily-checklist',           'FM Daily Check List',          4),
  ('HSM_CHECKSHEETS', 'induction-daily-checklist',    'Induction Daily Check List',   5),
  ('HSM_CHECKSHEETS', 'dc-daily-checklist',           'DC Daily Check List',          6),
  ('HSM_CHECKSHEETS', 'rm-daily-checklist',           'RM Daily Check List',          7)
ON CONFLICT (module_code, item_key) DO NOTHING;

-- Seed PTM sheet keys
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
VALUES
  ('PTM_CHECKSHEETS', 'breakdown',        'Breakdown Report',   1),
  ('PTM_CHECKSHEETS', 'checksheet',       'PTM Checksheet',     2),
  ('PTM_CHECKSHEETS', 'monthly-register', 'Monthly Register',   3)
ON CONFLICT (module_code, item_key) DO NOTHING;

-- Seed SMS sheet keys
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
VALUES
  ('SMS_CHECKSHEETS', 'breakdown-analysis', 'Breakdown Analysis Report', 1)
ON CONFLICT (module_code, item_key) DO NOTHING;
