-- Migration 035: Add HSM (Hot Strip Mill) as a login module
-- Shell only — no checksheet tables yet, those get added one at a time
-- the same way HBM's checksheets were (e.g. migration 028).

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('ADMIN', 'CRANE_MAINTENANCE', 'HBM_CHECKSHEETS', 'HSM_CHECKSHEETS'));
