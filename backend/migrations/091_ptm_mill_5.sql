-- Migration 091: add "Mill No. 5" to the PTM mills list.
-- PTM mills live in ptm_mills (managed on the PTM Admin Config page); the Breakdown Report form,
-- history filters, analytics and the Excel import all read this list, so no code change is needed.
-- Data only — safe to run more than once.

INSERT INTO ptm_mills (name, display_order)
SELECT 'Mill No. 5', COALESCE((SELECT MAX(display_order) FROM ptm_mills), 0) + 1
WHERE NOT EXISTS (SELECT 1 FROM ptm_mills WHERE name = 'Mill No. 5');
