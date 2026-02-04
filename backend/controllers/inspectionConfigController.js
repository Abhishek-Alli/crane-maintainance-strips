/**
 * ============================================
 * INSPECTION CONFIG CONTROLLER
 * ============================================
 * READ-ONLY MASTER DATA:
 * - inspection_sections
 * - inspection_items
 */

const { query } = require('../config/database');



class InspectionConfigController {

  /**
   * GET INSPECTION STRUCTURE
   * GET /api/config/inspection-structure
   */

  static async getInspectionSections(req, res) {
  const result = await query(`
    SELECT id, name
    FROM inspection_sections
    WHERE is_active = true
    ORDER BY display_order
  `);
  res.json(result.rows);
}

  static async getInspectionStructure(req, res) {
    try {
      const result = await query(`
        SELECT
          s.id AS section_id,
          s.name AS section_name,
          s.display_order AS section_order,
          i.id AS item_id,
          i.item_name,
          i.display_order AS item_order,
          i.dropdown_values
        FROM inspection_sections s
        LEFT JOIN inspection_items i
          ON i.section_id = s.id
         AND i.is_active = true
        WHERE s.is_active = true
        ORDER BY s.display_order, i.display_order
      `);

      const sectionsMap = {};

      for (const row of result.rows) {
        if (!sectionsMap[row.section_id]) {
          sectionsMap[row.section_id] = {
            section_id: row.section_id,
            section_name: row.section_name,
            items: []
          };
        }

        if (row.item_id) {
          sectionsMap[row.section_id].items.push({
            item_id: row.item_id,
            item_name: row.item_name,
            dropdown_values: row.dropdown_values
          });
        }
      }

      res.json({
        success: true,
        data: Object.values(sectionsMap)
      });

    } catch (error) {
      console.error('Inspection config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load inspection sections'
      });
    }
  }
}

module.exports = InspectionConfigController;
