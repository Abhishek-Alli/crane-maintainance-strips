/**
 * ============================================
 * INSPECTION MODEL - V3 LOCKED ARCHITECTURE
 * ============================================
 *
 * ABSOLUTE RULE: This model does NOT store inspection data in the database.
 *
 * ALL inspection data is stored in Google Sheets.
 * This model only provides:
 *   - Form configuration lookup (from database)
 *   - Audit trail logging (submission_log table - reference only)
 *   - Helper methods for data processing
 *
 * DO NOT add any methods that write inspection values to database tables.
 * ============================================
 */

const { query } = require('../config/database');

class InspectionModel {
  /**
   * ============================================
   * FORM CONFIGURATION METHODS (Database Read-Only)
   * ============================================
   */

  /**
   * Get form configuration with sections and items
   * This is used to validate submissions and apply alert rules
   */
  static async getFormConfiguration(formId) {
    const result = await query(
      `SELECT
        fi.id as item_id,
        fi.field_name,
        fi.field_type,
        fi.is_required,
        fi.dropdown_options,
        fi.alert_condition,
        fi.alert_value,
        fi.alert_message,
        fs.id as section_id,
        fs.name as section_name,
        fs.display_order as section_order,
        fi.display_order as item_order
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      WHERE fs.form_id = $1
      ORDER BY fs.display_order, fi.display_order`,
      [formId]
    );

    // Group by section
    const sections = {};
    result.rows.forEach(row => {
      if (!sections[row.section_id]) {
        sections[row.section_id] = {
          section_id: row.section_id,
          section_name: row.section_name,
          section_order: row.section_order,
          items: []
        };
      }
      sections[row.section_id].items.push({
        item_id: row.item_id,
        field_name: row.field_name,
        field_type: row.field_type,
        is_required: row.is_required,
        dropdown_options: row.dropdown_options,
        alert_condition: row.alert_condition,
        alert_value: row.alert_value,
        alert_message: row.alert_message,
        item_order: row.item_order
      });
    });

    return Object.values(sections).sort((a, b) => a.section_order - b.section_order);
  }

  /**
   * Get crane and shed details for an inspection
   */
  static async getCraneDetails(craneId, formId) {
    const result = await query(
      `SELECT
        c.id as crane_id,
        c.crane_number,
        c.maintenance_frequency,
        s.id as shed_id,
        s.name as shed_name,
        s.code as shed_code,
        f.id as form_id,
        f.name as form_name
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      CROSS JOIN forms f
      WHERE c.id = $1 AND f.id = $2 AND c.is_active = true AND f.is_active = true`,
      [craneId, formId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get crane-form assignment (sheet name)
   */
  static async getCraneFormAssignment(craneId, formId) {
    const result = await query(
      `SELECT
        cfa.id,
        cfa.sheet_name,
        cfa.sheet_created,
        c.crane_number,
        f.name as form_name
      FROM crane_form_assignments cfa
      JOIN cranes c ON cfa.crane_id = c.id
      JOIN forms f ON cfa.form_id = f.id
      WHERE cfa.crane_id = $1 AND cfa.form_id = $2`,
      [craneId, formId]
    );

    return result.rows[0] || null;
  }

  /**
   * ============================================
   * AUDIT TRAIL METHODS (Database Write - Reference Only)
   * ============================================
   */

  /**
   * Log submission to audit trail
   * This stores REFERENCES only, not actual inspection data
   */
  static async logSubmission(data) {
    const {
      inspection_date,
      shed_id,
      crane_id,
      form_id,
      submitted_by,
      crane_status,
      has_alerts,
      alert_count,
      sheet_name,
      row_start,
      row_end
    } = data;

    const result = await query(
      `INSERT INTO submission_log
      (inspection_date, shed_id, crane_id, form_id, submitted_by, crane_status, has_alerts, alert_count, sheet_name, google_sheet_row_start, google_sheet_row_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        inspection_date,
        shed_id,
        crane_id,
        form_id,
        submitted_by,
        crane_status,
        has_alerts,
        alert_count,
        sheet_name,
        row_start,
        row_end
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Check if submission exists in audit trail (for reference)
   * IMPORTANT: This is NOT the source of truth - Google Sheets is.
   * This is used for quick lookup only.
   */
  static async checkSubmissionExists(craneId, formId, inspectionDate) {
    const result = await query(
      `SELECT id FROM submission_log
      WHERE crane_id = $1 AND form_id = $2 AND inspection_date = $3`,
      [craneId, formId, inspectionDate]
    );
    return result.rows.length > 0;
  }

  /**
   * Get recent submissions from audit trail (for dashboard display)
   */
  static async getRecentSubmissions(limit = 10) {
    const result = await query(
      `SELECT
        sl.id,
        sl.inspection_date,
        sl.crane_status,
        sl.has_alerts,
        sl.alert_count,
        sl.sheet_name,
        sl.google_sheet_row_start,
        sl.google_sheet_row_end,
        sl.submission_timestamp,
        c.crane_number,
        c.id as crane_id,
        s.name as shed_name,
        f.name as form_name,
        u.username as recorded_by
      FROM submission_log sl
      JOIN cranes c ON sl.crane_id = c.id
      JOIN sheds s ON sl.shed_id = s.id
      JOIN forms f ON sl.form_id = f.id
      JOIN users u ON sl.submitted_by = u.id
      ORDER BY sl.submission_timestamp DESC
      LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * ============================================
   * HELPER METHODS
   * ============================================
   */

  /**
   * Calculate next maintenance date based on frequency
   */
  static calculateNextMaintenanceDate(inspectionDate, frequency) {
    const date = new Date(inspectionDate);

    switch (frequency) {
      case 'DAILY':
        date.setDate(date.getDate() + 1);
        break;
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      default:
        date.setDate(date.getDate() + 1);
    }

    return date.toISOString().split('T')[0];
  }

  /**
   * Apply alert rules to inspection items
   * Returns processed items with alert status
   * Default: NOT_OK triggers an alert if no alert_condition is configured
   */
  static applyAlertRules(submittedItems, formConfig) {
    let hasAlerts = false;
    let alertCount = 0;
    const processedSections = [];

    submittedItems.forEach(section => {
      const sectionConfig = formConfig.find(s => s.section_id === section.section_id);
      if (!sectionConfig) return;

      const processedItems = [];

      section.items.forEach(item => {
        if (!item.selected_value) return;

        const itemConfig = sectionConfig.items.find(i => i.item_id === item.item_id);
        if (!itemConfig) return;

        // Check alert condition
        let isAlert = false;

        // Get alert config with defaults (NOT_OK triggers alert by default)
        const alertCondition = itemConfig.alert_condition || 'EQUAL_TO';
        const alertValue = itemConfig.alert_value || 'NOT_OK';

        if (alertCondition === 'EQUAL_TO' && item.selected_value === alertValue) {
          isAlert = true;
          hasAlerts = true;
          alertCount++;
        } else if (alertCondition === 'NOT_EQUAL_TO' && item.selected_value !== alertValue) {
          isAlert = true;
          hasAlerts = true;
          alertCount++;
        }

        processedItems.push({
          item_id: item.item_id,
          item_name: itemConfig.field_name,
          selected_value: item.selected_value,
          is_alert: isAlert,
          alert_message: isAlert ? (itemConfig.alert_message || 'Item requires attention') : null,
          remarks: item.remarks || ''
        });
      });

      if (processedItems.length > 0) {
        processedSections.push({
          section_id: section.section_id,
          section_name: sectionConfig.section_name,
          items: processedItems
        });
      }
    });

    return {
      sections: processedSections,
      hasAlerts,
      alertCount,
      craneStatus: hasAlerts ? 'MAINTENANCE_REQUIRED' : 'OK'
    };
  }

  /**
   * Validate section completeness
   * If any field in section is filled, all required fields must be filled
   */
  static validateSectionCompleteness(submittedItems, formConfig) {
    const errors = [];

    submittedItems.forEach(section => {
      const sectionConfig = formConfig.find(s => s.section_id === section.section_id);
      if (!sectionConfig) return;

      // Check if any item in this section has a value
      const hasAnyValue = section.items.some(item => item.selected_value);

      if (hasAnyValue) {
        // Check all required fields
        sectionConfig.items.forEach(itemConfig => {
          if (itemConfig.is_required) {
            const submittedItem = section.items.find(i => i.item_id === itemConfig.item_id);
            if (!submittedItem || !submittedItem.selected_value) {
              errors.push({
                section: sectionConfig.section_name,
                item: itemConfig.field_name,
                message: `"${itemConfig.field_name}" is required when section "${sectionConfig.section_name}" has any values`
              });
            }
          }
        });
      }
    });

    return errors;
  }
}

module.exports = InspectionModel;
