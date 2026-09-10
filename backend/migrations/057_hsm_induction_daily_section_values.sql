-- Migration 057: Add numeric section_values column to HSM Induction Daily Check List

ALTER TABLE hsm_induction_daily_checklists
  ADD COLUMN IF NOT EXISTS section_values JSONB NOT NULL DEFAULT '{}'::jsonb;
