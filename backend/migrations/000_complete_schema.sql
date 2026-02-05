-- ============================================================
-- CRANE MAINTENANCE SYSTEM – COMPLETE DATABASE SCHEMA
-- Combines base tables + all migrations (001-007)
-- For fresh Supabase database setup
-- ============================================================

-- =====================
-- 1. ROLES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 2. DEPARTMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 3. USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50),
    role_id INTEGER REFERENCES roles(id),
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =====================
-- 4. SHEDS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS sheds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sheds_department_id ON sheds(department_id);

-- =====================
-- 5. CRANES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS cranes (
    id SERIAL PRIMARY KEY,
    crane_number VARCHAR(50) NOT NULL,
    shed_id INTEGER NOT NULL REFERENCES sheds(id),
    maintenance_frequency VARCHAR(50) DEFAULT 'DAILY',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(crane_number, shed_id)
);

CREATE INDEX IF NOT EXISTS idx_cranes_shed_id ON cranes(shed_id);

-- =====================
-- 6. FORMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    version INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 7. FORM_SECTIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS form_sections (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_form_sections_form_id ON form_sections(form_id);

-- =====================
-- 8. FORM_ITEMS TABLE (with alert columns from migration 004)
-- =====================
CREATE TABLE IF NOT EXISTS form_items (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) DEFAULT 'DROPDOWN',
    display_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    dropdown_options TEXT,
    default_value VARCHAR(255),
    help_text TEXT,
    alert_condition VARCHAR(50),
    alert_value VARCHAR(255),
    alert_message TEXT,
    conditional_logic JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_form_items_section_id ON form_items(section_id);

-- =====================
-- 9. CRANE_FORM_ASSIGNMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS crane_form_assignments (
    id SERIAL PRIMARY KEY,
    crane_id INTEGER NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    sheet_name VARCHAR(255),
    sheet_created TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(crane_id, form_id)
);

CREATE INDEX IF NOT EXISTS idx_crane_form_assignments_crane_id ON crane_form_assignments(crane_id);
CREATE INDEX IF NOT EXISTS idx_crane_form_assignments_form_id ON crane_form_assignments(form_id);

-- =====================
-- 10. USER_DEPARTMENTS (Migration 002)
-- =====================
CREATE TABLE IF NOT EXISTS user_departments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- =====================
-- 11. SUBMISSION_LOG (Migration 003)
-- =====================
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
    UNIQUE(crane_id, form_id, inspection_date)
);

CREATE INDEX IF NOT EXISTS idx_submission_log_crane_date ON submission_log(crane_id, inspection_date);
CREATE INDEX IF NOT EXISTS idx_submission_log_timestamp ON submission_log(submission_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_submission_log_has_alerts ON submission_log(has_alerts) WHERE has_alerts = TRUE;

-- =====================
-- 12. MONTHLY_MAINTENANCE_TRACKING (Migration 001)
-- =====================
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
    CONSTRAINT unique_crane_month UNIQUE (crane_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_mmt_department_month ON monthly_maintenance_tracking(department_code, year, month);
CREATE INDEX IF NOT EXISTS idx_mmt_status ON monthly_maintenance_tracking(status);
CREATE INDEX IF NOT EXISTS idx_mmt_crane_period ON monthly_maintenance_tracking(crane_id, year, month);
CREATE INDEX IF NOT EXISTS idx_mmt_year_month ON monthly_maintenance_tracking(year, month);

-- Trigger for updated_at
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

-- =====================
-- 13. INSPECTIONS (Migration 005)
-- =====================
CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    inspection_date DATE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    shed_id INTEGER NOT NULL REFERENCES sheds(id),
    crane_id INTEGER NOT NULL REFERENCES cranes(id),
    form_id INTEGER REFERENCES forms(id),
    recorded_by INTEGER REFERENCES users(id),
    crane_status VARCHAR(50) DEFAULT 'OK',
    has_alerts BOOLEAN DEFAULT FALSE,
    alert_count INTEGER DEFAULT 0,
    next_maintenance_date DATE,
    maintenance_start_time TIME,
    maintenance_stop_time TIME,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(crane_id, form_id, inspection_date)
);

CREATE INDEX IF NOT EXISTS idx_inspections_crane_date ON inspections(crane_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_shed ON inspections(shed_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(crane_status);
CREATE INDEX IF NOT EXISTS idx_inspections_has_alerts ON inspections(has_alerts) WHERE has_alerts = TRUE;

-- =====================
-- 14. INSPECTION_ITEMS (Migration 005)
-- =====================
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

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_section ON inspection_items(section_id);

-- =====================
-- 15. INSPECTION_VALUES (Migration 006)
-- =====================
CREATE TABLE IF NOT EXISTS inspection_values (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES form_sections(id),
    item_id INTEGER NOT NULL REFERENCES form_items(id),
    selected_value VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspection_values_inspection ON inspection_values(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_values_section ON inspection_values(section_id);

-- =====================
-- 16. TELEGRAM_RECIPIENTS (Migration 007)
-- =====================
CREATE TABLE IF NOT EXISTS telegram_recipients (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 17. VIEW: inspection_details (from Migration 005)
-- =====================
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

-- =====================
-- SEED: Default admin user (password: admin123)
-- =====================
INSERT INTO roles (name, permissions)
VALUES ('ADMIN', '{"all": true}')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, permissions)
VALUES ('OPERATOR', '{"inspect": true, "view": true}')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (username, password, role, role_id, is_active)
VALUES (
    'admin',
    'admin123',
    'ADMIN',
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    true
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- SCHEMA SETUP COMPLETE
-- ============================================================
