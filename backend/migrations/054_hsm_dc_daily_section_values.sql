-- Migration 054: Add numeric section_values column to HSM DC Daily Check List

ALTER TABLE hsm_dc_daily_checklists
  ADD COLUMN IF NOT EXISTS section_values JSONB NOT NULL DEFAULT '{}'::jsonb;
