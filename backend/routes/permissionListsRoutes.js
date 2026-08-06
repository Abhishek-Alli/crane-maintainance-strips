const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET all, optionally filtered by module_code
router.get('/', async (req, res) => {
  try {
    const { module_code } = req.query;
    let sql = 'SELECT * FROM app_permission_lists';
    const params = [];
    if (module_code) { sql += ' WHERE module_code=$1'; params.push(module_code); }
    sql += ' ORDER BY module_code, display_order, id';
    const { rows } = await query(sql, params);
    res.json({ success: true, items: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { module_code, item_key, item_label } = req.body;
    if (!module_code || !item_key || !item_label)
      return res.status(400).json({ success: false, message: 'module_code, item_key, item_label required' });
    const { rows: mx } = await query(
      'SELECT MAX(display_order) AS m FROM app_permission_lists WHERE module_code=$1', [module_code]
    );
    const order = (mx[0].m || 0) + 1;
    const { rows } = await query(
      'INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [module_code, item_key, item_label, order]
    );
    res.json({ success: true, item: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ success: false, message: 'Item key already exists for this module' });
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { item_label, display_order, is_active } = req.body;
    const { rows } = await query(
      'UPDATE app_permission_lists SET item_label=$1, display_order=$2, is_active=$3 WHERE id=$4 RETURNING *',
      [item_label, display_order, is_active, req.params.id]
    );
    res.json({ success: true, item: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM app_permission_lists WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
