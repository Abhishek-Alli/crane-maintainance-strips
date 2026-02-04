-- Migration: 006_inspection_values_table.sql
-- Creates inspection_values table to store individual inspection item responses

CREATE TABLE IF NOT EXISTS inspection_values (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES form_sections(id),
    item_id INTEGER NOT NULL REFERENCES form_items(id),
    selected_value VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_inspection_values_inspection
    ON inspection_values(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspection_values_section
    ON inspection_values(section_id);
