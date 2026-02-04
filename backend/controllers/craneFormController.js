const { query, transaction } = require('../config/database');
const GoogleSheetManagerService = require('../services/googleSheetManagerService');

class CraneFormController {
  /**
   * Assign form to crane
   * Creates Google Sheet automatically
   * POST /api/crane-forms
   */
  static async assignFormToCrane(req, res) {
    try {
      const { crane_id, form_id } = req.body;

      if (!crane_id || !form_id) {
        return res.status(400).json({
          success: false,
          message: 'Crane ID and Form ID are required'
        });
      }

      // Get crane and form details
      const result = await query(
        `SELECT
          c.crane_number,
          c.shed_id,
          s.name as shed_name,
          f.name as form_name
        FROM cranes c
        JOIN sheds s ON c.shed_id = s.id
        CROSS JOIN forms f
        WHERE c.id = $1 AND f.id = $2`,
        [crane_id, form_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Crane or form not found'
        });
      }

      const { crane_number, form_name, shed_name } = result.rows[0];

      // Check if assignment already exists
      const existingAssignment = await query(
        `SELECT id FROM crane_form_assignments
        WHERE crane_id = $1 AND form_id = $2`,
        [crane_id, form_id]
      );

      if (existingAssignment.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This form is already assigned to this crane'
        });
      }

      // Create Google Sheet for this crane-form combination
      let sheetCreationResult;
      try {
        sheetCreationResult = await GoogleSheetManagerService.createSheetForCraneForm(
          crane_number,
          form_name
        );
      } catch (error) {
        console.error('Failed to create Google Sheet:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create Google Sheet for this assignment',
          error: error.message
        });
      }

      // Save assignment in database
      const assignmentResult = await query(
        `INSERT INTO crane_form_assignments
        (crane_id, form_id, sheet_name, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at`,
        [crane_id, form_id, sheetCreationResult.sheetName, req.user.id]
      );

      res.status(201).json({
        success: true,
        message: 'Form assigned to crane successfully',
        data: {
          assignment_id: assignmentResult.rows[0].id,
          crane_number,
          form_name,
          shed_name,
          google_sheet: {
            sheet_name: sheetCreationResult.sheetName,
            sheet_id: sheetCreationResult.sheetId,
            created: sheetCreationResult.created,
            message: sheetCreationResult.message
          },
          created_at: assignmentResult.rows[0].created_at
        }
      });
    } catch (error) {
      console.error('Assign form to crane error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign form to crane',
        error: error.message
      });
    }
  }

  /**
   * Get all crane-form assignments
   * GET /api/crane-forms
   */
  static async getAllAssignments(req, res) {
    try {
      const result = await query(
        `SELECT
          cfa.id,
          cfa.crane_id,
          cfa.form_id,
          cfa.sheet_name,
          c.crane_number,
          s.name as shed_name,
          f.name as form_name,
          u.full_name as created_by_name,
          cfa.created_at
        FROM crane_form_assignments cfa
        JOIN cranes c ON cfa.crane_id = c.id
        JOIN sheds s ON c.shed_id = s.id
        JOIN forms f ON cfa.form_id = f.id
        LEFT JOIN users u ON cfa.created_by = u.id
        ORDER BY cfa.created_at DESC`
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assignments',
        error: error.message
      });
    }
  }

  /**
   * Get forms assigned to a specific crane
   * GET /api/crane-forms/crane/:crane_id
   */
  static async getFormsByCrane(req, res) {
    try {
      const { crane_id } = req.params;

      const result = await query(
        `SELECT
          cfa.id as assignment_id,
          f.id as form_id,
          f.name as form_name,
          f.description,
          cfa.sheet_name,
          cfa.created_at
        FROM crane_form_assignments cfa
        JOIN forms f ON cfa.form_id = f.id
        WHERE cfa.crane_id = $1
        ORDER BY cfa.created_at DESC`,
        [crane_id]
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get forms by crane error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forms',
        error: error.message
      });
    }
  }

  /**
   * Get cranes assigned to a specific form
   * GET /api/crane-forms/form/:form_id
   */
  static async getCranesByForm(req, res) {
    try {
      const { form_id } = req.params;

      const result = await query(
        `SELECT
          cfa.id as assignment_id,
          c.id as crane_id,
          c.crane_number,
          s.name as shed_name,
          cfa.sheet_name,
          cfa.created_at
        FROM crane_form_assignments cfa
        JOIN cranes c ON cfa.crane_id = c.id
        JOIN sheds s ON c.shed_id = s.id
        WHERE cfa.form_id = $1
        ORDER BY cfa.created_at DESC`,
        [form_id]
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get cranes by form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cranes',
        error: error.message
      });
    }
  }

  /**
   * Remove form assignment from crane
   * DELETE /api/crane-forms/:id
   */
  static async removeAssignment(req, res) {
    try {
      const { id } = req.params;

      // Get assignment details before deleting
      const assignmentResult = await query(
        `SELECT
          cfa.sheet_name,
          c.crane_number,
          f.name as form_name
        FROM crane_form_assignments cfa
        JOIN cranes c ON cfa.crane_id = c.id
        JOIN forms f ON cfa.form_id = f.id
        WHERE cfa.id = $1`,
        [id]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
      }

      const { sheet_name, crane_number, form_name } = assignmentResult.rows[0];

      // Delete assignment
      await query('DELETE FROM crane_form_assignments WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Form assignment removed successfully',
        data: {
          crane_number,
          form_name,
          sheet_name,
          note: 'Google Sheet was not deleted. Data is preserved.'
        }
      });
    } catch (error) {
      console.error('Remove assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove assignment',
        error: error.message
      });
    }
  }

  /**
   * Bulk assign form to multiple cranes
   * POST /api/crane-forms/bulk-assign
   */
  static async bulkAssignForm(req, res) {
    try {
      const { form_id, crane_ids } = req.body;

      if (!form_id || !crane_ids || crane_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Form ID and crane IDs array are required'
        });
      }

      const results = [];
      const errors = [];

      for (const crane_id of crane_ids) {
        try {
          // Get crane and form details
          const result = await query(
            `SELECT
              c.crane_number,
              f.name as form_name
            FROM cranes c
            CROSS JOIN forms f
            WHERE c.id = $1 AND f.id = $2`,
            [crane_id, form_id]
          );

          if (result.rows.length === 0) {
            errors.push({
              crane_id,
              error: 'Crane or form not found'
            });
            continue;
          }

          const { crane_number, form_name } = result.rows[0];

          // Check if already assigned
          const existingAssignment = await query(
            `SELECT id FROM crane_form_assignments
            WHERE crane_id = $1 AND form_id = $2`,
            [crane_id, form_id]
          );

          if (existingAssignment.rows.length > 0) {
            errors.push({
              crane_id,
              crane_number,
              error: 'Already assigned'
            });
            continue;
          }

          // Create Google Sheet
          const sheetResult = await GoogleSheetManagerService.createSheetForCraneForm(
            crane_number,
            form_name
          );

          // Save assignment
          await query(
            `INSERT INTO crane_form_assignments
            (crane_id, form_id, sheet_name, created_by)
            VALUES ($1, $2, $3, $4)`,
            [crane_id, form_id, sheetResult.sheetName, req.user.id]
          );

          results.push({
            crane_id,
            crane_number,
            form_name,
            sheet_name: sheetResult.sheetName,
            success: true
          });
        } catch (error) {
          errors.push({
            crane_id,
            error: error.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Assigned form to ${results.length} crane(s)`,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: crane_ids.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });
    } catch (error) {
      console.error('Bulk assign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk assign form',
        error: error.message
      });
    }
  }
}

module.exports = CraneFormController;
