-- Migration 080: SMS DG check sheet — battery voltage / coolant motor / coolant level / battery charger
-- Stored as JSONB ({ key: { value, remark } }); keys live in controllers/smsDgController.js (DG_CHECKS).
ALTER TABLE sms_dg_checklists ADD COLUMN IF NOT EXISTS checks JSONB NOT NULL DEFAULT '{}'::jsonb;
