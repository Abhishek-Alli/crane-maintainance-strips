const CraneModel = require('../models/Crane');

class CraneController {

  /**
   * =========================================================
   * EXISTING: Get all cranes (OPTIONALLY filtered by shed_id)
   * GET /api/cranes
   * =========================================================
   */
  static async getAll(req, res) {
    try {
      const filters = {
        shed_id: req.query.shed_id ? parseInt(req.query.shed_id) : undefined
      };

      const cranes = await CraneModel.getAll(filters);

      res.json({
        success: true,
        data: cranes,
        count: cranes.length
      });
    } catch (error) {
      console.error('Get cranes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cranes',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Get crane by ID
   * GET /api/cranes/:id
   * =========================================================
   */
  static async getById(req, res) {
    try {
      const crane = await CraneModel.getById(req.params.id);

      if (!crane) {
        return res.status(404).json({
          success: false,
          message: 'Crane not found'
        });
      }

      res.json({
        success: true,
        data: crane
      });
    } catch (error) {
      console.error('Get crane error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch crane',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Get cranes by shed (PATH PARAM)
   * GET /api/cranes/shed/:shed_id
   * =========================================================
   */
  static async getByShed(req, res) {
    try {
      const cranes = await CraneModel.getByShed(req.params.shed_id);

      res.json({
        success: true,
        data: cranes,
        count: cranes.length
      });
    } catch (error) {
      console.error('Get cranes by shed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cranes',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * ✅ NEW: Get cranes by shed (QUERY PARAM – FOR FRONTEND)
   * GET /api/cranes?shed_id=123
   * This supports the new Department → Shed → Crane dropdown flow
   * =========================================================
   */
  static async getByShedQuery(req, res) {
    try {
      const { shed_id } = req.query;

      if (!shed_id) {
        return res.status(400).json({
          success: false,
          message: 'shed_id is required'
        });
      }

      const cranes = await CraneModel.getByShed(parseInt(shed_id));

      res.json({
        success: true,
        data: cranes,
        count: cranes.length
      });
    } catch (error) {
      console.error('Get cranes by shed (query) error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cranes',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Get maintenance notifications
   * GET /api/cranes/notifications
   * =========================================================
   */
  static async getNotifications(req, res) {
    try {
      await CraneModel.updateMaintenanceStatus();
      const notifications = await CraneModel.getMaintenanceNotifications();

      res.json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Get dashboard statistics
   * GET /api/cranes/dashboard/stats
   * =========================================================
   */
  static async getDashboardStats(req, res) {
    try {
      await CraneModel.updateMaintenanceStatus();
      const stats = await CraneModel.getDashboardStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Create new crane
   * POST /api/cranes
   * =========================================================
   */
  static async create(req, res) {
    try {
      const { shed_id, crane_number, maintenance_frequency } = req.body;

      const crane = await CraneModel.create({
        shed_id,
        crane_number,
        maintenance_frequency: maintenance_frequency || 'DAILY'
      });

      res.status(201).json({
        success: true,
        message: 'Crane created successfully',
        data: crane
      });
    } catch (error) {
      console.error('Create crane error:', error);

      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Crane number already exists for this shed'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create crane',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Update crane
   * PUT /api/cranes/:id
   * =========================================================
   */
  static async update(req, res) {
    try {
      const { shed_id, crane_number, maintenance_frequency } = req.body;

      const crane = await CraneModel.update(req.params.id, {
        shed_id,
        crane_number,
        maintenance_frequency
      });

      if (!crane) {
        return res.status(404).json({
          success: false,
          message: 'Crane not found'
        });
      }

      res.json({
        success: true,
        message: 'Crane updated successfully',
        data: crane
      });
    } catch (error) {
      console.error('Update crane error:', error);

      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Crane number already exists for this shed'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update crane',
        error: error.message
      });
    }
  }

  /**
   * =========================================================
   * EXISTING: Delete crane
   * DELETE /api/cranes/:id
   * =========================================================
   */
  static async delete(req, res) {
    try {
      const crane = await CraneModel.delete(req.params.id);

      if (!crane) {
        return res.status(404).json({
          success: false,
          message: 'Crane not found'
        });
      }

      res.json({
        success: true,
        message: 'Crane deleted successfully'
      });
    } catch (error) {
      console.error('Delete crane error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete crane',
        error: error.message
      });
    }
  }
}

module.exports = CraneController;
