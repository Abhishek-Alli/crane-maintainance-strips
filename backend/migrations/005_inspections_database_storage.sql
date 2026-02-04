-- Migration: 005_inspections_database_storage.sql
-- Creates tables to store ALL inspection data in PostgreSQL
-- This replaces Google Sheets as the primary storage

-- Main inspections table
CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    inspection_date DATE NOT NULL,
    shed_id INTEGER NOT NULL REFERENCES sheds(id),
    crane_id INTEGER NOT NULL REFERENCES cranes(id),
    form_id INTEGER NOT NULL REFERENCES forms(id),
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    crane_status VARCHAR(50) DEFAULT 'OK',
    has_alerts BOOLEAN DEFAULT FALSE,
    alert_count INTEGER DEFAULT 0,
    next_maintenance_date DATE,
    maintenance_start_time TIME,
    maintenance_stop_time TIME,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate inspections for same crane-form-date
    UNIQUE(crane_id, form_id, inspection_date)
);

-- Inspection items table - stores individual field values
CREATE TABLE IF NOT EXISTS inspection_items (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES form_sections(id),
    item_id INTEGER NOT NULL REFERENCES form_items(id),
    selected_value VARCHAR(255),
    is_alert BOOLEAN DEFAULT FALSE,
    alert_message TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_inspections_crane_date
    ON inspections(crane_id, inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_shed
    ON inspections(shed_id);

CREATE INDEX IF NOT EXISTS idx_inspections_date
    ON inspections(inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_status
    ON inspections(crane_status);

CREATE INDEX IF NOT EXISTS idx_inspections_has_alerts
    ON inspections(has_alerts) WHERE has_alerts = TRUE;

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection
    ON inspection_items(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspection_items_section
    ON inspection_items(section_id);

-- View for easy querying with all related data
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
JOIN forms f ON i.form_id = f.id
JOIN users u ON i.recorded_by = u.id;
