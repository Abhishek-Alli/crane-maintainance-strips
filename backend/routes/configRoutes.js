const express = require('express');
const router = express.Router();
// const InspectionConfigModel = require('../models/InspectionConfig');
const GoogleSheetsService = require('../services/googleSheetsService');
const db = require('../config/database');
const InspectionConfigModel = require('../models/InspectionConfig');
const InspectionConfigController = require('../controllers/inspectionConfigController');
const { authenticate } = require('../middleware/auth');



router.get(
  '/inspection-structure',
  authenticate,
  InspectionConfigController.getInspectionStructure
);


/**
 * =========================================================
 * GET /api/config/departments
 * Fetch all active departments
 * =========================================================
 */
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

/**
 * =========================================================
 * GET /api/config/sheds
 * Fetch sheds for a specific department
 * REQUIRED: department_id
 * =========================================================
 */
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

/**
 * =========================================================
 * GET /api/config/sheds/by-department/:departmentId
 * (kept for backward compatibility)
 * =========================================================
 */
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

/**
 * =========================================================
 * GET /api/config/cranes
 * Fetch cranes for a specific department
 * REQUIRED: department_id
 * =========================================================
 */
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
/**
 * =========================================================
 * GET /api/config/inspection-sections
 * =========================================================
 */

/**
 * =========================================================
 * GET /api/config/sections
 * Requires form_id query parameter to load sections
 * =========================================================
 */
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


/**
 * POST /api/config/sections
 */
router.post('/sections', async (req, res) => {
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

/**
 * POST /api/config/items
 */
router.post('/items', async (req, res) => {
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

/**
 * PUT /api/config/items/:id
 */
router.put('/items/:id', async (req, res) => {
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

/**
 * POST /api/config/sheds
 */
router.post('/sheds', async (req, res) => {
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

/**
 * PUT /api/config/sheds/:id
 */
router.put('/sheds/:id', async (req, res) => {
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

/**
 * =========================================================
 * GET /api/config/test-google-sheets
 * =========================================================
 */
router.get('/test-google-sheets', async (req, res) => {
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
