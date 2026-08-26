-- Migration 045: Add HOD to users user_type check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check CHECK (
  user_type = ANY (ARRAY[
    'ADMIN',
    'CRANE_MAINTENANCE',
    'HBM_CHECKSHEETS',
    'HSM_CHECKSHEETS',
    'PTM_CHECKSHEETS',
    'SMS_CHECKSHEETS',
    'HOD'
  ])
);
