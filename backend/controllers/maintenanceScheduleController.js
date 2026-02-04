/**
 * Maintenance Schedule Controller
 *
 * Handles API endpoints for calendar-based maintenance scheduling.
 */

const MaintenanceTracking = require('../models/MaintenanceTracking');
const {
  resolveDepartmentByDate,
  getDepartmentDateRange,
  getMonthSchedule,
  getAllDepartmentWindows,
  getCurrentWindowStatus,
  DEPARTMENT_COLORS
} = require('../utils/maintenanceSchedule');

class MaintenanceScheduleController {
  /**
   * GET /api/maintenance-schedule/calendar
   * Returns calendar data with department assignments for each day
   */
  static async getCalendar(req, res) {
    try {
      const { year, month } = req.query;

      // Default to current month if not specified
      const now = new Date();
      const targetYear = year ? parseInt(year) : now.getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // Convert to 0-indexed

      // Get the schedule for each day
      const schedule = getMonthSchedule(targetYear, targetMonth);

      // Get department windows
      const departmentWindows = getAllDepartmentWindows(targetYear, targetMonth);

      // Get summaries for each department
      const summaries = await MaintenanceTracking.getAllDepartmentSummaries(targetYear, targetMonth + 1);

      // Format summaries as object keyed by department
      const summaryByDepartment = {};
      summaries.forEach(s => {
        summaryByDepartment[s.department_code] = {
          total: parseInt(s.total_cranes),
          completed: parseInt(s.completed),
          pending: parseInt(s.pending),
          missed: parseInt(s.missed),
          rescheduled: parseInt(s.rescheduled)
        };
      });

      res.json({
        success: true,
        data: {
          year: targetYear,
          month: targetMonth + 1, // Return as 1-indexed
          monthName: new Date(targetYear, targetMonth).toLocaleString('default', { month: 'long' }),
          schedule: schedule.map(day => ({
            day: day.day,
            department: day.department,
            color: day.color.hex,
            bgClass: day.color.bg,
            textClass: day.color.text,
            date: day.date.toISOString().split('T')[0]
          })),
          departmentWindows: Object.fromEntries(
            Object.entries(departmentWindows).map(([dept, range]) => [
              dept,
              {
                startDay: range.startDay,
                endDay: range.endDay,
                startDate: range.startDate.toISOString().split('T')[0],
                endDate: range.endDate.toISOString().split('T')[0]
              }
            ])
          ),
          departmentColors: DEPARTMENT_COLORS,
          summaries: summaryByDepartment
        }
      });
    } catch (error) {
      console.error('Get calendar error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch calendar data',
        error: error.message
      });
    }
  }

  /**
   * GET /api/maintenance-schedule/status
   * Returns maintenance status for cranes in a department for a given month
   */
  static async getDepartmentStatus(req, res) {
    try {
      const { department_code, year, month } = req.query;

      if (!department_code) {
        return res.status(400).json({
          success: false,
          message: 'department_code is required'
        });
      }

      // Default to current month if not specified
      const now = new Date();
      const targetYear = year ? parseInt(year) : now.getFullYear();
      const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

      // Initialize tracking for this month if needed
      await MaintenanceTracking.initializeMonthTracking(targetYear, targetMonth);

      // Get status for all cranes in the department
      const cranes = await MaintenanceTracking.getStatusByDepartment(
        department_code,
        targetYear,
        targetMonth
      );

      // Get summary
      const summary = await MaintenanceTracking.getDepartmentSummary(
        department_code,
        targetYear,
        targetMonth
      );

      // Get department window
      const windowRange = getDepartmentDateRange(department_code, targetYear, targetMonth - 1);

      res.json({
        success: true,
        data: {
          department: department_code,
          year: targetYear,
          month: targetMonth,
          window: {
            startDay: windowRange.startDay,
            endDay: windowRange.endDay,
            startDate: windowRange.startDate.toISOString().split('T')[0],
            endDate: windowRange.endDate.toISOString().split('T')[0]
          },
          summary: {
            total_cranes: parseInt(summary.total_cranes),
            completed: parseInt(summary.completed),
            pending: parseInt(summary.pending),
            missed: parseInt(summary.missed),
            rescheduled: parseInt(summary.rescheduled)
          },
          cranes: cranes.map(c => ({
            crane_id: c.crane_id,
            crane_number: c.crane_number,
            shed_name: c.shed_name,
            status: c.status,
            scheduled_start: c.scheduled_start,
            scheduled_end: c.scheduled_end,
            completed_date: c.completed_date,
            completed_in_reschedule: c.completed_in_reschedule,
            manually_marked: c.manually_marked,
            notes: c.notes
          }))
        }
      });
    } catch (error) {
      console.error('Get department status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department status',
        error: error.message
      });
    }
  }

  /**
   * GET /api/maintenance-schedule/reschedule
   * Returns all missed/pending cranes available for reschedule
   */
  static async getRescheduleCranes(req, res) {
    try {
      const { year, month } = req.query;

      // Default to current month if not specified
      const now = new Date();
      const targetYear = year ? parseInt(year) : now.getFullYear();
      const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

      // Get reschedule window
      const rescheduleWindow = getDepartmentDateRange('RESCHEDULE', targetYear, targetMonth - 1);

      // Get all missed cranes
      const missedCranes = await MaintenanceTracking.getMissedCranes(targetYear, targetMonth);

      res.json({
        success: true,
        data: {
          year: targetYear,
          month: targetMonth,
          reschedule_window: {
            startDay: rescheduleWindow.startDay,
            endDay: rescheduleWindow.endDay,
            startDate: rescheduleWindow.startDate.toISOString().split('T')[0],
            endDate: rescheduleWindow.endDate.toISOString().split('T')[0]
          },
          missed_cranes: missedCranes.map(c => ({
            tracking_id: c.id,
            crane_id: c.crane_id,
            crane_number: c.crane_number,
            department: c.department_code,
            department_name: c.department_name,
            shed_name: c.shed_name,
            status: c.status,
            original_window: {
              start: c.scheduled_start,
              end: c.scheduled_end
            }
          })),
          count: missedCranes.length
        }
      });
    } catch (error) {
      console.error('Get reschedule cranes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reschedule cranes',
        error: error.message
      });
    }
  }

  /**
   * GET /api/maintenance-schedule/active-window
   * Returns the current active maintenance window
   */
  static async getActiveWindow(req, res) {
    try {
      const windowStatus = getCurrentWindowStatus(new Date());

      res.json({
        success: true,
        data: windowStatus
      });
    } catch (error) {
      console.error('Get active window error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active window',
        error: error.message
      });
    }
  }

  /**
   * POST /api/maintenance-schedule/mark-status
   * Manually mark a crane's maintenance status (Admin only)
   */
  static async markStatus(req, res) {
    try {
      const { crane_id, year, month, status, notes } = req.body;
      const userId = req.user?.id;

      if (!crane_id || !year || !month || !status) {
        return res.status(400).json({
          success: false,
          message: 'crane_id, year, month, and status are required'
        });
      }

      const validStatuses = ['PENDING', 'COMPLETED', 'MISSED', 'RESCHEDULED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Ensure tracking record exists
      await MaintenanceTracking.ensureTrackingExists(crane_id, year, month);

      // Update the status
      const updated = await MaintenanceTracking.manuallyMarkStatus(
        crane_id,
        year,
        month,
        status,
        userId,
        notes
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Tracking record not found'
        });
      }

      res.json({
        success: true,
        message: `Crane status updated to ${status}`,
        data: updated
      });
    } catch (error) {
      console.error('Mark status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update status',
        error: error.message
      });
    }
  }

  /**
   * POST /api/maintenance-schedule/initialize
   * Initialize tracking records for a month (Admin only)
   */
  static async initializeMonth(req, res) {
    try {
      const { year, month } = req.body;

      // Default to current month if not specified
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month || now.getMonth() + 1;

      const result = await MaintenanceTracking.initializeMonthTracking(targetYear, targetMonth);

      res.json({
        success: true,
        message: `Initialized tracking for ${targetMonth}/${targetYear}`,
        data: result
      });
    } catch (error) {
      console.error('Initialize month error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize month tracking',
        error: error.message
      });
    }
  }

  /**
   * POST /api/maintenance-schedule/update-expired
   * Update expired statuses (mark PENDING as MISSED)
   */
  static async updateExpiredStatuses(req, res) {
    try {
      const result = await MaintenanceTracking.updateExpiredStatuses(new Date());

      res.json({
        success: true,
        message: 'Expired statuses updated',
        data: result
      });
    } catch (error) {
      console.error('Update expired statuses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update expired statuses',
        error: error.message
      });
    }
  }

  /**
   * GET /api/maintenance-schedule/crane/:craneId
   * Get tracking status for a specific crane
   */
  static async getCraneStatus(req, res) {
    try {
      const { craneId } = req.params;
      const { year, month } = req.query;

      // Default to current month if not specified
      const now = new Date();
      const targetYear = year ? parseInt(year) : now.getFullYear();
      const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

      // Get or create tracking record
      const tracking = await MaintenanceTracking.ensureTrackingExists(
        parseInt(craneId),
        targetYear,
        targetMonth
      );

      if (!tracking) {
        return res.status(404).json({
          success: false,
          message: 'Crane not found'
        });
      }

      res.json({
        success: true,
        data: tracking
      });
    } catch (error) {
      console.error('Get crane status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch crane status',
        error: error.message
      });
    }
  }

  /**
   * GET /api/maintenance-schedule/check-window
   * Check if a crane inspection is within the correct window
   */
  static async checkWindow(req, res) {
    try {
      const { crane_id, inspection_date } = req.query;

      if (!crane_id) {
        return res.status(400).json({
          success: false,
          message: 'crane_id is required'
        });
      }

      const date = inspection_date ? new Date(inspection_date) : new Date();
      const activeDepartment = resolveDepartmentByDate(date);

      // Get crane's department code
      const craneDepartment = await MaintenanceTracking.getCraneDepartmentCode(parseInt(crane_id));

      if (!craneDepartment) {
        return res.status(404).json({
          success: false,
          message: 'Crane not found'
        });
      }

      const isInWindow = activeDepartment === craneDepartment || activeDepartment === 'RESCHEDULE';
      const isReschedule = activeDepartment === 'RESCHEDULE';

      // Get the crane's window for this month
      const year = date.getFullYear();
      const month = date.getMonth();
      const craneWindow = getDepartmentDateRange(craneDepartment, year, month);

      res.json({
        success: true,
        data: {
          crane_id: parseInt(crane_id),
          crane_department: craneDepartment,
          inspection_date: date.toISOString().split('T')[0],
          active_department: activeDepartment,
          is_in_window: isInWindow,
          is_reschedule_period: isReschedule,
          crane_window: {
            startDay: craneWindow.startDay,
            endDay: craneWindow.endDay,
            startDate: craneWindow.startDate.toISOString().split('T')[0],
            endDate: craneWindow.endDate.toISOString().split('T')[0]
          },
          warning: !isInWindow
            ? `This crane belongs to ${craneDepartment} department. The maintenance window for ${craneDepartment} is ${craneWindow.startDate.toISOString().split('T')[0]} to ${craneWindow.endDate.toISOString().split('T')[0]}.`
            : null
        }
      });
    } catch (error) {
      console.error('Check window error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check window',
        error: error.message
      });
    }
  }
}

module.exports = MaintenanceScheduleController;
