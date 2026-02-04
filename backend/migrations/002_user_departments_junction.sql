-- Migration: Create user_departments junction table for many-to-many relationship
-- This allows users to be assigned to multiple departments

-- Create the junction table
CREATE TABLE IF NOT EXISTS user_departments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- Migrate existing user-department relationships to the junction table
INSERT INTO user_departments (user_id, department_id)
SELECT id, department_id FROM users WHERE department_id IS NOT NULL
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Note: We keep the department_id column in users table for backwards compatibility
-- but it will no longer be required for login
