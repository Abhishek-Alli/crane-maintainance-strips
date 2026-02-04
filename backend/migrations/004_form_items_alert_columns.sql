-- Migration: 004_form_items_alert_columns.sql
-- Adds alert-related columns to form_items table for validation rules

-- Add alert_condition column (e.g., 'EQUAL_TO', 'NOT_EQUAL_TO')
ALTER TABLE form_items
ADD COLUMN IF NOT EXISTS alert_condition VARCHAR(50);

-- Add alert_value column (the value that triggers an alert)
ALTER TABLE form_items
ADD COLUMN IF NOT EXISTS alert_value VARCHAR(255);

-- Add alert_message column (message to show when alert is triggered)
ALTER TABLE form_items
ADD COLUMN IF NOT EXISTS alert_message TEXT;

-- Set default alert rules for existing items
-- By default, if selected_value = 'NOT_OK', it triggers an alert
UPDATE form_items
SET
    alert_condition = 'EQUAL_TO',
    alert_value = 'NOT_OK',
    alert_message = 'Item marked as NOT OK - requires attention'
WHERE alert_condition IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN form_items.alert_condition IS 'Condition type: EQUAL_TO, NOT_EQUAL_TO, GREATER_THAN, LESS_THAN';
COMMENT ON COLUMN form_items.alert_value IS 'Value to compare against for triggering alert';
COMMENT ON COLUMN form_items.alert_message IS 'Message displayed when alert condition is met';
