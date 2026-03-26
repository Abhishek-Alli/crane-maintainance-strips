-- ============================================================
-- Add per-recipient checksheet type subscriptions
-- NULL = receive ALL checksheet types (backward compatible)
-- Array of type keys = receive only those types
-- ============================================================

ALTER TABLE telegram_recipients
  ADD COLUMN IF NOT EXISTS checksheet_types TEXT[] DEFAULT NULL;

-- Example values stored: ARRAY['dc-motor','rolling-stand','mill-mech']
-- NULL means subscribe to all checksheet notifications
