const express = require('express');
const router = express.Router();
const GoogleSheetsService = require('../services/googleSheetsService');
const db = require('../config/database');
const InspectionConfigModel = require('../models/InspectionConfig');
const InspectionConfigController = require('../controllers/inspectionConfigController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get(
  '/inspection-structure',
  InspectionConfigController.getInspectionStructure
);

router.get('/departments', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name
      FROM departments
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

router.get('/sub-departments', async (req, res) => {
  try {
    const { department_id } = req.query;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'department_id is required'
      });
    }

    const { rows } = await db.query(`
      SELECT id, department_id, name, is_active
      FROM sub_departments
      WHERE department_id = $1
      AND is_active = true
      ORDER BY name
    `, [department_id]);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Sub-department fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

router.get('/sheds', async (req, res) => {
  try {
    const { department_id } = req.query;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'department_id is required'
      });
    }

    const { rows } = await db.query(`
      SELECT id, department_id, name, code, is_active
      FROM sheds
      WHERE department_id = $1 AND is_active = true
      ORDER BY name
    `, [department_id]);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get sheds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sheds'
    });
  }
});

router.get('/sheds/by-department/:departmentId', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, department_id, name, code, is_active
      FROM sheds
      WHERE department_id = $1 AND is_active = true
      ORDER BY name
    `, [req.params.departmentId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get sheds by department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sheds by department'
    });
  }
});

router.get('/cranes', async (req, res) => {
  try {
    const { department_id } = req.query;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'department_id is required'
      });
    }

    const { rows } = await db.query(`
      SELECT 
        c.id,
        c.department_id,
        c.shed_id,
        c.crane_number,
        c.maintenance_frequency,
        c.last_inspection_date,
        c.next_maintenance_date,
        c.current_status,
        c.current_maintenance_status,
        c.is_active,
        s.name as shed_name
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      WHERE c.department_id = $1 AND c.is_active = true
      ORDER BY s.name, c.crane_number
    `, [department_id]);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get cranes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cranes'
    });
  }
});

router.get('/sections', async (req, res) => {
  try {
    const { form_id } = req.query;

    if (!form_id) {
      return res.status(400).json({
        success: false,
        message: 'form_id is required'
      });
    }

    const sections =
      await InspectionConfigModel.getSectionsWithItems(
        parseInt(form_id, 10)
      );

    res.json({
      success: true,
      data: sections
    });

  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections'
    });
  }
});

router.post('/sections', requireAdmin, async (req, res) => {
  try {
    const section = await InspectionConfigModel.createSection(req.body);
    res.status(201).json({ success: true, message: 'Section created', data: section });
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create section'
    });
  }
});

router.post('/items', requireAdmin, async (req, res) => {
  try {
    const item = await InspectionConfigModel.createItem(req.body);
    res.status(201).json({ success: true, message: 'Item created', data: item });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item'
    });
  }
});

router.put('/items/:id', requireAdmin, async (req, res) => {
  try {
    const item = await InspectionConfigModel.updateItem(req.params.id, req.body);
    res.json({ success: true, message: 'Item updated', data: item });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
});

router.post('/sheds', requireAdmin, async (req, res) => {
  try {
    const shed = await InspectionConfigModel.createShed(req.body);
    res.status(201).json({ success: true, message: 'Shed created', data: shed });
  } catch (error) {
    console.error('Create shed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shed'
    });
  }
});

router.put('/sheds/:id', requireAdmin, async (req, res) => {
  try {
    const shed = await InspectionConfigModel.updateShed(req.params.id, req.body);
    res.json({ success: true, message: 'Shed updated', data: shed });
  } catch (error) {
    console.error('Update shed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shed'
    });
  }
});

/** Admin-only diagnostic — disabled unless explicitly enabled */
router.get('/test-google-sheets', requireAdmin, async (req, res) => {
  if (process.env.ALLOW_SHEETS_TEST !== 'true') {
    return res.status(403).json({
      success: false,
      message: 'Google Sheets test endpoint is disabled'
    });
  }
  try {
    const result = await GoogleSheetsService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Test Google Sheets error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed'
    });
  }
});

module.exports = router;
