-- Migration 082: CCM Pump House — rename areas; SCALE PIT (was COMMON) has no sub-area
UPDATE sms_ccm_pump_house_checklists SET area = 'BILLET - PUMP HOUSE' WHERE area = 'BILLET';
UPDATE sms_ccm_pump_house_checklists SET area = 'SLAB - PUMP HOUSE' WHERE area = 'SLAB';
UPDATE sms_ccm_pump_house_checklists SET area = 'SCALE PIT', sub_area = '' WHERE area = 'COMMON';
