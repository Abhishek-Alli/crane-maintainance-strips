-- ============================================================
-- MIGRATION 010: Add sub_departments table + sub_department_id to inspections
-- ============================================================

-- 1. CREATE sub_departments TABLE
CREATE TABLE IF NOT EXISTS sub_departments (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_departments_department ON sub_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_sub_departments_active ON sub_departments(is_active);

-- 2. ADD sub_department_id COLUMN TO inspections TABLE
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS sub_department_id INTEGER REFERENCES sub_departments(id);

CREATE INDEX IF NOT EXISTS idx_inspections_sub_department ON inspections(sub_department_id);

-- ============================================================
-- MIGRATION 010 COMPLETE
-- ============================================================
