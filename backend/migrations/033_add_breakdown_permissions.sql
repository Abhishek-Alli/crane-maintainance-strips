-- Add 'breakdown' to existing HBM user permission rows
-- Rows where allowed_checksheets IS NULL already have full access — leave them unchanged.
-- Only update rows that have an explicit array and don't already include the new key.

UPDATE hbm_user_permissions
SET allowed_checksheets = array_append(allowed_checksheets, 'breakdown')
WHERE allowed_checksheets IS NOT NULL
  AND NOT ('breakdown' = ANY(allowed_checksheets));
