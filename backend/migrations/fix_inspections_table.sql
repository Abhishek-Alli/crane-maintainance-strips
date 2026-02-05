-- FIX: Add missing form_id column to inspections table
-- Run this if you already created the inspections table without form_id

-- Add form_id column if missing
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS form_id INTEGER REFERENCES forms(id);

-- Change recorded_by to INTEGER if it was VARCHAR
-- First drop the column if it exists as wrong type, then recreate
DO $$
BEGIN
    -- Check if recorded_by exists and is VARCHAR
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspections'
        AND column_name = 'recorded_by'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE inspections DROP COLUMN recorded_by;
        ALTER TABLE inspections ADD COLUMN recorded_by INTEGER REFERENCES users(id);
    END IF;
END $$;

-- Drop the old unique constraint if exists
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_crane_id_inspection_date_key;

-- Add correct unique constraint
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_crane_id_form_id_inspection_date_key;
ALTER TABLE inspections ADD CONSTRAINT inspections_crane_id_form_id_inspection_date_key
    UNIQUE(crane_id, form_id, inspection_date);

-- Recreate the view
CREATE OR REPLACE VIEW inspection_details AS
SELECT
    i.id,
    i.inspection_date,
    i.crane_status,
    i.has_alerts,
    i.alert_count,
    i.next_maintenance_date,
    i.maintenance_start_time,
    i.maintenance_stop_time,
    i.remarks,
    i.created_at,
    c.crane_number,
    c.id as crane_id,
    s.name as shed_name,
    s.id as shed_id,
    d.name as department_name,
    d.id as department_id,
    f.name as form_name,
    f.id as form_id,
    u.username as recorded_by
FROM inspections i
JOIN cranes c ON i.crane_id = c.id
JOIN sheds s ON i.shed_id = s.id
JOIN departments d ON s.department_id = d.id
LEFT JOIN forms f ON i.form_id = f.id
LEFT JOIN users u ON i.recorded_by = u.id;
