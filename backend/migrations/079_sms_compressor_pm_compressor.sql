-- Migration 079: SMS Compressor — Scheduled PM: which compressor (1 or 2) the check was filled for
ALTER TABLE sms_compressor_pm_checklists ADD COLUMN IF NOT EXISTS compressor VARCHAR(10);
