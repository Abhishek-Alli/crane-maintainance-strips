const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Public — login page needs module list without auth
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM app_modules ORDER BY display_order, id');
    res.json({ success: true, modules: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.use(authenticate);
router.use(requireAdmin);

router.post('/', async (req, res) => {
  try {
    const { name, code, color, route_prefix } = req.body;
    if (!name || !code || !route_prefix) return res.status(400).json({ success: false, message: 'name, code and route_prefix required' });
    const { rows: ex } = await query('SELECT MAX(display_order) AS mx FROM app_modules');
    const order = (ex[0].mx || 0) + 1;
    const { rows } = await query(
      'INSERT INTO app_modules (name, code, color, route_prefix, display_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, code.toUpperCase().replace(/\s+/g, '_'), color || 'blue', route_prefix, order]
    );
    res.json({ success: true, module: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ success: false, message: 'Module code already exists' });
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, color, route_prefix, is_active, display_order } = req.body;
    const { rows } = await query(
      'UPDATE app_modules SET name=$1, color=$2, route_prefix=$3, is_active=$4, display_order=$5 WHERE id=$6 RETURNING *',
      [name, color, route_prefix, is_active, display_order, req.params.id]
    );
    res.json({ success: true, module: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM app_modules WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
