-- Migration 087: SMS Slab Caster Strand 1 and 2 — permission list entries (data uses sms_caster_motor_checklists from 085)

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', v.item_key, v.item_label,
       COALESCE((SELECT MAX(display_order) FROM app_permission_lists WHERE module_code = 'SMS_CHECKSHEETS'), 0) + v.ord
FROM (VALUES ('slab-strand-1', 'Slab Caster Strand 1', 1), ('slab-strand-2', 'Slab Caster Strand 2', 2)) AS v(item_key, item_label, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists p
  WHERE p.module_code = 'SMS_CHECKSHEETS' AND p.item_key = v.item_key
);
