-- Migration 055: Add numeric section_values column to HSM FM Daily Check List

ALTER TABLE hsm_fm_daily_checklists
  ADD COLUMN IF NOT EXISTS section_values JSONB NOT NULL DEFAULT '{}'::jsonb;
