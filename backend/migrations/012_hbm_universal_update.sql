-- ============================================================
-- MIGRATION 012: HBM Universal Template Update
-- Adds: subsections, time, action_taken, DC Motor log tables
-- ============================================================

-- =====================
-- 1. HBM_CHECKSHEET_SUBSECTIONS (NEW)
-- Optional sub-grouping inside a section
-- =====================
CREATE TABLE IF NOT EXISTS hbm_checksheet_subsections (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES hbm_checksheet_sections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_subsections_section ON hbm_checksheet_subsections(section_id);

-- =====================
-- 2. ADD subsection_id TO hbm_checksheet_items (nullable)
-- NULL = item belongs directly to section
-- SET  = item belongs to subsection within section
-- =====================
ALTER TABLE hbm_checksheet_items
    ADD COLUMN IF NOT EXISTS subsection_id INTEGER REFERENCES hbm_checksheet_subsections(id) ON DELETE CASCADE;

-- =====================
-- 3. ADD checksheet_time TO hbm_checksheets
-- Stores the time when work was actually performed
-- =====================
ALTER TABLE hbm_checksheets
    ADD COLUMN IF NOT EXISTS checksheet_time TIME;

-- =====================
-- 4. ADD action_taken TO hbm_checksheet_values
-- Compulsory when value = NOT_OK
-- =====================
ALTER TABLE hbm_checksheet_values
    ADD COLUMN IF NOT EXISTS action_taken TEXT;

-- =====================
-- 5. HBM_DC_MOTOR_LOGS (NEW)
-- Header record for each DC Motor maintenance checksheet
-- =====================
CREATE TABLE IF NOT EXISTS hbm_dc_motor_logs (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL,
    log_time TIME NOT NULL,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('DAY', 'NIGHT')),
    heat_start TIME,
    heat_end TIME,
    remarks TEXT,
    filled_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_dc_motor_logs_date ON hbm_dc_motor_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_hbm_dc_motor_logs_user ON hbm_dc_motor_logs(filled_by);

-- =====================
-- 6. HBM_DC_MOTOR_ITEMS (NEW)
-- Individual check results for each DC Motor log
-- =====================
CREATE TABLE IF NOT EXISTS hbm_dc_motor_items (
    id SERIAL PRIMARY KEY,
    log_id INTEGER NOT NULL REFERENCES hbm_dc_motor_logs(id) ON DELETE CASCADE,
    block_name VARCHAR(100) NOT NULL,
    section_name VARCHAR(100) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('OK', 'NOT_OK')),
    remark TEXT,
    action_taken TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbm_dc_motor_items_log ON hbm_dc_motor_items(log_id);

-- ============================================================
-- MIGRATION 012 COMPLETE
-- ============================================================
