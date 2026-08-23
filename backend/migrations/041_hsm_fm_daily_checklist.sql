-- Migration 041: HSM FM Daily Check List

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'HSM_CHECKSHEETS', 'fm-daily-checklist', 'FM Daily Check List', 4
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'HSM_CHECKSHEETS' AND item_key = 'fm-daily-checklist'
);

CREATE TABLE IF NOT EXISTS hsm_fm_daily_checklists (
  id                  SERIAL PRIMARY KEY,
  report_date         DATE         NOT NULL,
  shift               VARCHAR(10)  NOT NULL,
  shift_engineer      VARCHAR(150),
  checklist_items     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  guide_centerline    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  note                TEXT,
  filled_by           INTEGER      NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_fm_daily_date ON hsm_fm_daily_checklists(report_date);
CREATE INDEX IF NOT EXISTS idx_hsm_fm_daily_shift ON hsm_fm_daily_checklists(shift);
