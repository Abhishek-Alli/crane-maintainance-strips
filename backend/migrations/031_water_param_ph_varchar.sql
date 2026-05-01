-- Change ph column from NUMERIC to VARCHAR to support range values like "6 - 7.5"
ALTER TABLE hbm_water_param_entries
  ALTER COLUMN ph TYPE VARCHAR(20) USING ph::TEXT;
