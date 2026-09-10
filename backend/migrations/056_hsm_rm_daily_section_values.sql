-- Migration 056: Add numeric section_values column to HSM RM Daily Check List

ALTER TABLE hsm_rm_daily_checklists
  ADD COLUMN IF NOT EXISTS section_values JSONB NOT NULL DEFAULT '{}'::jsonb;
