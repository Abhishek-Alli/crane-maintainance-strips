-- ============================================================
-- Crane Maintenance per-user section/page access control
-- Admin can toggle which sections a crane user can access
-- ============================================================

CREATE TABLE IF NOT EXISTS crane_user_permissions (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Which sections this user can access (NULL = all)
  allowed_sections TEXT[] DEFAULT NULL,

  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default permissions for all existing Crane Maintenance users
INSERT INTO crane_user_permissions (user_id)
SELECT id FROM users
WHERE user_type = 'CRANE_MAINTENANCE'
ON CONFLICT (user_id) DO NOTHING;
