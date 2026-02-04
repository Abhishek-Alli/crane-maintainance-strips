-- Migration: Create monthly_maintenance_tracking table
-- Description: Tracks crane maintenance status per month based on calendar schedule
-- Run: psql -U postgres -d crane_maintenance -f migrations/001_monthly_maintenance_tracking.sql

-- Create the monthly_maintenance_tracking table
CREATE TABLE IF NOT EXISTS monthly_maintenance_tracking (
  id SERIAL PRIMARY KEY,
  crane_id INTEGER NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
  department_code VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'COMPLETED', 'MISSED', 'RESCHEDULED')),
  scheduled_start DATE NOT NULL,
  scheduled_end DATE NOT NULL,
  completed_date DATE,
  completed_in_reschedule BOOLEAN DEFAULT FALSE,
  submission_log_id INTEGER REFERENCES submission_log(id) ON DELETE SET NULL,
  manually_marked BOOLEAN DEFAULT FALSE,
  marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one record per crane per month
  CONSTRAINT unique_crane_month UNIQUE (crane_id, year, month)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mmt_department_month
  ON monthly_maintenance_tracking(department_code, year, month);

CREATE INDEX IF NOT EXISTS idx_mmt_status
  ON monthly_maintenance_tracking(status);

CREATE INDEX IF NOT EXISTS idx_mmt_crane_period
  ON monthly_maintenance_tracking(crane_id, year, month);

CREATE INDEX IF NOT EXISTS idx_mmt_year_month
  ON monthly_maintenance_tracking(year, month);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mmt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mmt_updated_at ON monthly_maintenance_tracking;

CREATE TRIGGER trigger_mmt_updated_at
  BEFORE UPDATE ON monthly_maintenance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_mmt_updated_at();

-- Add comment to table
COMMENT ON TABLE monthly_maintenance_tracking IS
  'Tracks monthly maintenance status for cranes based on calendar schedule. Each crane has one record per month.';

COMMENT ON COLUMN monthly_maintenance_tracking.status IS
  'PENDING: Not yet maintained, COMPLETED: Maintained in window, MISSED: Window passed without maintenance, RESCHEDULED: Maintained during reschedule period';

COMMENT ON COLUMN monthly_maintenance_tracking.completed_in_reschedule IS
  'True if the maintenance was completed during the reschedule period (days 24-end of month)';
