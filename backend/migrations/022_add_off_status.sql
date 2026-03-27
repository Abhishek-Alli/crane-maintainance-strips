-- Migration 022: Add 'OFF' as a valid status for DC Motor, Rolling Stand, Mill Mech, Cooling Bed checksheets

-- DC Motor items
ALTER TABLE hbm_dc_motor_items DROP CONSTRAINT IF EXISTS hbm_dc_motor_items_status_check;
ALTER TABLE hbm_dc_motor_items ADD CONSTRAINT hbm_dc_motor_items_status_check CHECK (status IN ('OK', 'NOT_OK', 'OFF'));

-- Rolling Stand items
ALTER TABLE hbm_rolling_stand_items DROP CONSTRAINT IF EXISTS hbm_rolling_stand_items_status_check;
ALTER TABLE hbm_rolling_stand_items ADD CONSTRAINT hbm_rolling_stand_items_status_check CHECK (status IN ('OK', 'NOT_OK', 'OFF'));

-- Mill Mech items
ALTER TABLE hbm_mill_mech_items DROP CONSTRAINT IF EXISTS hbm_mill_mech_items_status_check;
ALTER TABLE hbm_mill_mech_items ADD CONSTRAINT hbm_mill_mech_items_status_check CHECK (status IN ('OK', 'NOT_OK', 'OFF'));

-- Cooling Bed items
ALTER TABLE hbm_cooling_bed_items DROP CONSTRAINT IF EXISTS hbm_cooling_bed_items_status_check;
ALTER TABLE hbm_cooling_bed_items ADD CONSTRAINT hbm_cooling_bed_items_status_check CHECK (status IN ('OK', 'NOT_OK', 'OFF'));
