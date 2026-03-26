-- ============================================================
-- HBM per-user permission controls
-- Admin can toggle these for each HBM user
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_user_permissions (
  user_id               INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Which checksheet types this user can fill (NULL = all)
  allowed_checksheets   TEXT[] DEFAULT NULL,

  -- Feature toggles
  can_download_pdf      BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete            BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_submitted    BOOLEAN NOT NULL DEFAULT FALSE,

  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default permissions for all existing HBM users
INSERT INTO hbm_user_permissions (user_id)
SELECT id FROM users
WHERE user_type = 'HBM_CHECKSHEETS'
ON CONFLICT (user_id) DO NOTHING;
