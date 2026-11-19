-- Migration 090: Crane inspection notifications now follow per-recipient subscriptions.
-- Until now every active recipient received them, so subscribe everyone who is active today
-- to 'crane:inspection' to keep that behaviour. (Data only - no table ownership needed.)

UPDATE telegram_recipients
SET sms_sheets = array_append(COALESCE(sms_sheets, '{}'), 'crane:inspection')
WHERE is_active = true
  AND NOT ('crane:inspection' = ANY(COALESCE(sms_sheets, '{}')));
