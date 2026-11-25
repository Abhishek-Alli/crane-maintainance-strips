-- Migration 092: numeric value per DC Motor checksheet item
-- (used for "NO. OF CARBON BRUSH USED" - a count entered next to the OK / NOT OK / OFF buttons).
-- hbm_dc_motor_items is owned by another DB role, so run as postgres:
--   sudo -u postgres psql -p 5434 -d maintainance -c "ALTER TABLE hbm_dc_motor_items ADD COLUMN IF NOT EXISTS item_value VARCHAR(50);"
ALTER TABLE hbm_dc_motor_items ADD COLUMN IF NOT EXISTS item_value VARCHAR(50);
