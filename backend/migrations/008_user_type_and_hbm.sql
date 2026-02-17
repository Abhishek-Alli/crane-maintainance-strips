-- ============================================================
-- MIGRATION 008: Add user_type column + HBM Module Tables
-- ============================================================

-- =====================
-- 1. ADD user_type TO USERS TABLE
-- =====================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'CRANE_MAINTENANCE'
CHECK (user_type IN ('ADMIN', 'CRANE_MAINTENANCE', 'HBM_CHECKSHEETS'));

-- Update existing admin users
UPDATE users SET user_type = 'ADMIN' WHERE role = 'ADMIN' AND user_type IS NULL;
UPDATE users SET user_type = 'CRANE_MAINTENANCE' WHERE role != 'ADMIN' AND user_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- =====================
-- 2. HBM_MACHINES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS hbm_machines (
    id SERIAL PRIMARY KEY,
    machine_name VARCHAR(255) NOT NULL,
    machine_code VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    department VARCHAR(255),
    machine_type VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    installation_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_machines_code ON hbm_machines(machine_code);
CREATE INDEX IF NOT EXISTS idx_hbm_machines_active ON hbm_machines(is_active);

-- =====================
-- 3. HBM_CHECKSHEET_TEMPLATES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS hbm_checksheet_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    machine_type VARCHAR(100),
    frequency VARCHAR(50) DEFAULT 'DAILY'
        CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY')),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 4. HBM_CHECKSHEET_SECTIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS hbm_checksheet_sections (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES hbm_checksheet_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_sections_template ON hbm_checksheet_sections(template_id);

-- =====================
-- 5. HBM_CHECKSHEET_ITEMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS hbm_checksheet_items (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES hbm_checksheet_sections(id) ON DELETE CASCADE,
    check_point VARCHAR(500) NOT NULL,
    check_type VARCHAR(50) DEFAULT 'OK_NOT_OK'
        CHECK (check_type IN ('OK_NOT_OK', 'READING', 'TEXT', 'YES_NO')),
    display_order INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    min_value DECIMAL,
    max_value DECIMAL,
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_items_section ON hbm_checksheet_items(section_id);

-- =====================
-- 6. HBM_MACHINE_TEMPLATES (assignment)
-- =====================
CREATE TABLE IF NOT EXISTS hbm_machine_templates (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES hbm_machines(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES hbm_checksheet_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(machine_id, template_id)
);

-- =====================
-- 7. HBM_CHECKSHEETS (filled checksheets)
-- =====================
CREATE TABLE IF NOT EXISTS hbm_checksheets (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES hbm_machines(id),
    template_id INTEGER NOT NULL REFERENCES hbm_checksheet_templates(id),
    checksheet_date DATE NOT NULL,
    shift VARCHAR(20) DEFAULT 'DAY'
        CHECK (shift IN ('DAY', 'NIGHT', 'GENERAL')),
    status VARCHAR(50) DEFAULT 'OK'
        CHECK (status IN ('OK', 'ATTENTION_REQUIRED', 'CRITICAL')),
    has_issues BOOLEAN DEFAULT false,
    issue_count INTEGER DEFAULT 0,
    remarks TEXT,
    filled_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(machine_id, template_id, checksheet_date, shift)
);

CREATE INDEX IF NOT EXISTS idx_hbm_checksheets_machine ON hbm_checksheets(machine_id);
CREATE INDEX IF NOT EXISTS idx_hbm_checksheets_date ON hbm_checksheets(checksheet_date DESC);
CREATE INDEX IF NOT EXISTS idx_hbm_checksheets_status ON hbm_checksheets(status);

-- =====================
-- 8. HBM_CHECKSHEET_VALUES (filled values)
-- =====================
CREATE TABLE IF NOT EXISTS hbm_checksheet_values (
    id SERIAL PRIMARY KEY,
    checksheet_id INTEGER NOT NULL REFERENCES hbm_checksheets(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES hbm_checksheet_items(id),
    value VARCHAR(500),
    is_issue BOOLEAN DEFAULT false,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_values_checksheet ON hbm_checksheet_values(checksheet_id);

-- ============================================================
-- MIGRATION 008 COMPLETE
-- ============================================================
