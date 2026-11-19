-- Migration 086: SMS Billet Caster Strand 2 — permission list entry (uses sms_caster_motor_checklists from 085)

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'billet-strand-2', 'Billet Caster Strand 2',
       COALESCE((SELECT MAX(display_order) FROM app_permission_lists WHERE module_code = 'SMS_CHECKSHEETS'), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'billet-strand-2'
);
