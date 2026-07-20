-- Migration 034: Add mill-level ON/OFF status to DC Motor Airflow checksheet
-- When the mill is OFF for the day, no stand readings are required — only
-- the reason (remark) is captured.

ALTER TABLE hbm_dc_motor_airflow_logs
  ADD COLUMN IF NOT EXISTS mill_status VARCHAR(10) NOT NULL DEFAULT 'ON';

ALTER TABLE hbm_dc_motor_airflow_logs
  DROP CONSTRAINT IF EXISTS hbm_dc_motor_airflow_logs_mill_status_check;
ALTER TABLE hbm_dc_motor_airflow_logs
  ADD CONSTRAINT hbm_dc_motor_airflow_logs_mill_status_check CHECK (mill_status IN ('ON', 'OFF'));
