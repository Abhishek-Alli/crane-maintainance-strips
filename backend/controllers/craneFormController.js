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
      const { crane_id, department_id, sub_department_id } = req.body;

      if (!crane_id || !department_id || !sub_department_id) {
        return res.status(400).json({
          success: false,
          message: 'Crane ID, Department ID and SubDepartment ID are required'
        });
      }

      // 1️⃣ Get form_id from department_forms
      const formMapping = await query(
        `SELECT form_id
       FROM department_forms
       WHERE department_id = $1
       AND sub_department_id = $2`,
        [department_id, sub_department_id]
      );

      if (formMapping.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No form mapped for this department and sub-department'
        });
      }

      const form_id = formMapping.rows[0].form_id;

      // 2️⃣ Get crane + form details
      const result = await query(
        `SELECT
          c.crane_number,
          c.shed_id,
          s.name as shed_name,
          f.name as form_name
        FROM cranes c
        JOIN sheds s ON c.shed_id = s.id
        JOIN forms f ON f.id = $2
        WHERE c.id = $1`,
        [crane_id, form_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Crane or form not found'
        });
      }

      const { crane_number, form_name, shed_name } = result.rows[0];

      // 3️⃣ Check if already assigned
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

      // 4️⃣ Create Google Sheet
      let sheetCreationResult;
      try {
        sheetCreationResult =
          await GoogleSheetManagerService.createSheetForCraneForm(
            crane_number,
            form_name
          );
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create Google Sheet',
          error: error.message
        });
      }

      // 5️⃣ Save assignment
      const assignmentResult = await query(
        `INSERT INTO crane_form_assignments
       (crane_id, form_id, sheet_name, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
        [crane_id, form_id, sheetCreationResult.sheetName, req.user.id]
      );

      return res.status(201).json({
        success: true,
        message: 'Form assigned successfully',
        data: {
          assignment_id: assignmentResult.rows[0].id,
          crane_number,
          form_name,
          shed_name,
          google_sheet: {
            sheet_name: sheetCreationResult.sheetName,
            sheet_id: sheetCreationResult.sheetId
          },
          created_at: assignmentResult.rows[0].created_at
        }
      });

    } catch (error) {
      console.error('Assign form to crane error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to assign form to crane',
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
    const { crane_ids, department_id, sub_department_id } = req.body;

    if (!crane_ids || !department_id || !sub_department_id) {
      return res.status(400).json({
        success: false,
        message: 'Crane IDs, Department ID and SubDepartment ID are required'
      });
    }

    // 1️⃣ Get form_id from department_forms
    const formMapping = await query(
      `SELECT form_id
       FROM department_forms
       WHERE department_id = $1
       AND sub_department_id = $2`,
      [department_id, sub_department_id]
    );

    if (formMapping.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No form mapped for this department and sub-department'
      });
    }

    const form_id = formMapping.rows[0].form_id;

    const results = [];
    const errors = [];

    for (const crane_id of crane_ids) {
      try {
        // Check duplicate
        const existing = await query(
          `SELECT id FROM crane_form_assignments
           WHERE crane_id = $1 AND form_id = $2`,
          [crane_id, form_id]
        );

        if (existing.rows.length > 0) {
          errors.push({ crane_id, error: 'Already assigned' });
          continue;
        }

        // Get crane details
        const craneRes = await query(
          `SELECT crane_number FROM cranes WHERE id = $1`,
          [crane_id]
        );

        if (craneRes.rows.length === 0) {
          errors.push({ crane_id, error: 'Crane not found' });
          continue;
        }

        const crane_number = craneRes.rows[0].crane_number;

        // Create sheet
        const sheet =
          await GoogleSheetManagerService.createSheetForCraneForm(
            crane_number,
            `Auto Assigned Form`
          );

        // Insert
        await query(
          `INSERT INTO crane_form_assignments
           (crane_id, form_id, sheet_name, created_by)
           VALUES ($1, $2, $3, $4)`,
          [crane_id, form_id, sheet.sheetName, req.user.id]
        );

        results.push({ crane_id, success: true });

      } catch (err) {
        errors.push({ crane_id, error: err.message });
      }
    }

    return res.status(201).json({
      success: true,
      summary: {
        total: crane_ids.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Bulk assign error:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk assignment failed',
      error: error.message
    });
  }
}
}


module.exports = CraneFormController;
