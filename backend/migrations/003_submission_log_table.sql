-- Migration: 003_submission_log_table.sql
-- Creates the submission_log table for audit trail of inspections
-- This stores REFERENCES to Google Sheets data, not actual inspection values

CREATE TABLE IF NOT EXISTS submission_log (
    id SERIAL PRIMARY KEY,
    inspection_date DATE NOT NULL,
    shed_id INTEGER NOT NULL REFERENCES sheds(id),
    crane_id INTEGER NOT NULL REFERENCES cranes(id),
    form_id INTEGER NOT NULL REFERENCES forms(id),
    submitted_by INTEGER NOT NULL REFERENCES users(id),
    crane_status VARCHAR(50) DEFAULT 'OK',
    has_alerts BOOLEAN DEFAULT FALSE,
    alert_count INTEGER DEFAULT 0,
    sheet_name VARCHAR(255),
    google_sheet_row_start INTEGER,
    google_sheet_row_end INTEGER,
    submission_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate submissions for same crane-form-date
    UNIQUE(crane_id, form_id, inspection_date)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_submission_log_crane_date
    ON submission_log(crane_id, inspection_date);

CREATE INDEX IF NOT EXISTS idx_submission_log_timestamp
    ON submission_log(submission_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_submission_log_has_alerts
    ON submission_log(has_alerts) WHERE has_alerts = TRUE;
