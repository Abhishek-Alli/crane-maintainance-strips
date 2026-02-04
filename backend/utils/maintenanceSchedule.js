/**
 * Maintenance Schedule Utilities
 *
 * Core business logic for calendar-based crane maintenance scheduling.
 * Department maintenance windows follow a fixed monthly pattern:
 * - Days 1-5: HSM department
 * - Days 6-12: HBM department
 * - Days 13-23: PTM department
 * - Days 24-End: RESCHEDULE period for missed maintenance
 */

const DEPARTMENT_SCHEDULE = {
  HSM: { startDay: 1, endDay: 5 },
  HBM: { startDay: 6, endDay: 12 },
  PTM: { startDay: 13, endDay: 23 }
  // RESCHEDULE: Days 24 to end of month (dynamic based on month)
};

const DEPARTMENT_COLORS = {
  HSM: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', hex: '#3B82F6' },
  HBM: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', hex: '#10B981' },
  PTM: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', hex: '#F97316' },
  RESCHEDULE: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', hex: '#8B5CF6' }
};

/**
 * Resolve which department is active based on the day of month
 * @param {Date|string} date - The date to check
 * @returns {'HSM'|'HBM'|'PTM'|'RESCHEDULE'} - The active department or RESCHEDULE period
 */
function resolveDepartmentByDate(date) {
  const d = new Date(date);
  const day = d.getDate();

  if (day >= 1 && day <= 5) return 'HSM';
  if (day >= 6 && day <= 12) return 'HBM';
  if (day >= 13 && day <= 23) return 'PTM';
  return 'RESCHEDULE'; // Days 24 to end of month
}

/**
 * Get the last day of a given month
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {number} - Last day of the month
 */
function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the date range for a department in a given month
 * @param {string} department - 'HSM'|'HBM'|'PTM'|'RESCHEDULE'
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {{startDay: number, endDay: number, startDate: Date, endDate: Date}}
 */
function getDepartmentDateRange(department, year, month) {
  const lastDay = getLastDayOfMonth(year, month);

  let startDay, endDay;

  if (department === 'RESCHEDULE') {
    startDay = 24;
    endDay = lastDay;
  } else if (DEPARTMENT_SCHEDULE[department]) {
    startDay = DEPARTMENT_SCHEDULE[department].startDay;
    endDay = DEPARTMENT_SCHEDULE[department].endDay;
  } else {
    throw new Error(`Invalid department: ${department}`);
  }

  return {
    startDay,
    endDay,
    startDate: new Date(year, month, startDay),
    endDate: new Date(year, month, endDay)
  };
}

/**
 * Check if a date falls within the reschedule period
 * @param {Date|string} date
 * @returns {boolean}
 */
function isReschedulePeriod(date) {
  return resolveDepartmentByDate(date) === 'RESCHEDULE';
}

/**
 * Check if a date falls within a department's maintenance window
 * @param {Date|string} date
 * @param {string} departmentCode - 'HSM'|'HBM'|'PTM'
 * @returns {boolean}
 */
function isInDepartmentWindow(date, departmentCode) {
  const activeDepartment = resolveDepartmentByDate(date);
  return activeDepartment === departmentCode || activeDepartment === 'RESCHEDULE';
}

/**
 * Generate the complete month schedule with department assignments
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {Array<{day: number, department: string, color: object, date: Date}>}
 */
function getMonthSchedule(year, month) {
  const lastDay = getLastDayOfMonth(year, month);
  const schedule = [];

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const department = resolveDepartmentByDate(date);

    schedule.push({
      day,
      department,
      color: DEPARTMENT_COLORS[department],
      date
    });
  }

  return schedule;
}

/**
 * Get all department windows for a given month
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {Object} - Object with department keys and their date ranges
 */
function getAllDepartmentWindows(year, month) {
  const departments = ['HSM', 'HBM', 'PTM', 'RESCHEDULE'];
  const windows = {};

  departments.forEach(dept => {
    windows[dept] = getDepartmentDateRange(dept, year, month);
  });

  return windows;
}

/**
 * Determine if a department's window has passed for a given date
 * @param {string} departmentCode - 'HSM'|'HBM'|'PTM'
 * @param {Date|string} currentDate
 * @returns {boolean}
 */
function hasWindowPassed(departmentCode, currentDate) {
  const d = new Date(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const range = getDepartmentDateRange(departmentCode, year, month);
  return day > range.endDay;
}

/**
 * Check if we're currently in a department's window
 * @param {string} departmentCode - 'HSM'|'HBM'|'PTM'
 * @param {Date|string} currentDate
 * @returns {boolean}
 */
function isCurrentlyInWindow(departmentCode, currentDate) {
  const d = new Date(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const range = getDepartmentDateRange(departmentCode, year, month);
  return day >= range.startDay && day <= range.endDay;
}

/**
 * Get the current maintenance window status
 * @param {Date|string} date
 * @returns {Object} - Current window information
 */
function getCurrentWindowStatus(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const activeDepartment = resolveDepartmentByDate(d);
  const range = getDepartmentDateRange(activeDepartment, year, month);

  return {
    activeDepartment,
    year,
    month: month + 1, // Return 1-indexed month for API
    monthName: d.toLocaleString('default', { month: 'long' }),
    currentDay: d.getDate(),
    windowStart: range.startDay,
    windowEnd: range.endDay,
    windowStartDate: range.startDate.toISOString().split('T')[0],
    windowEndDate: range.endDate.toISOString().split('T')[0],
    isReschedule: activeDepartment === 'RESCHEDULE',
    color: DEPARTMENT_COLORS[activeDepartment]
  };
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  DEPARTMENT_SCHEDULE,
  DEPARTMENT_COLORS,
  resolveDepartmentByDate,
  getLastDayOfMonth,
  getDepartmentDateRange,
  isReschedulePeriod,
  isInDepartmentWindow,
  getMonthSchedule,
  getAllDepartmentWindows,
  hasWindowPassed,
  isCurrentlyInWindow,
  getCurrentWindowStatus,
  formatDateISO
};
