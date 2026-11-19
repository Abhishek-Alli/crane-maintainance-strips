-- Migration 089: Telegram recipient options for SMS notifications
--   is_admin    : receives EVERY notification (all modules, normal + abnormal, new + edited)
--   alerts_only : (non-admin) receives only abnormal entries, e.g. motor current above max
--   sms_sheets  : SMS sheet keys this recipient is subscribed to. NULL / empty = no SMS notifications
--                 (kept separate from checksheet_types so existing HBM recipients are not flooded with SMS messages)

ALTER TABLE telegram_recipients
  ADD COLUMN IF NOT EXISTS is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alerts_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_sheets  TEXT[]  DEFAULT NULL;
