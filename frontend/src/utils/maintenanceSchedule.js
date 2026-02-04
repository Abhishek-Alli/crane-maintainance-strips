/**
 * Maintenance Schedule Utilities (Frontend)
 *
 * Pure functions for calendar-based crane maintenance scheduling.
 * Mirrors backend logic for immediate UI rendering without API calls.
 *
 * Department maintenance windows follow a fixed monthly pattern:
 * - Days 1-5: HSM department
 * - Days 6-12: HBM department
 * - Days 13-23: PTM department
 * - Days 24-End: RESCHEDULE period for missed maintenance
 */

export const DEPARTMENT_SCHEDULE = {
  HSM: { startDay: 1, endDay: 5 },
  HBM: { startDay: 6, endDay: 12 },
  PTM: { startDay: 13, endDay: 23 }
  // RESCHEDULE: Days 24 to end of month (dynamic)
};

export const DEPARTMENT_COLORS = {
  HSM: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    hex: '#3B82F6',
    light: '#DBEAFE',
    dark: '#1E40AF'
  },
  HBM: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    hex: '#10B981',
    light: '#D1FAE5',
    dark: '#065F46'
  },
  PTM: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    hex: '#F97316',
    light: '#FFEDD5',
    dark: '#9A3412'
  },
  RESCHEDULE: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    hex: '#8B5CF6',
    light: '#EDE9FE',
    dark: '#5B21B6'
  }
};

export const STATUS_COLORS = {
  PENDING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300'
  },
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300'
  },
  MISSED: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300'
  },
  RESCHEDULED: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300'
  }
};

/**
 * Resolve which department is active based on the day of month
 * @param {Date|string} date - The date to check
 * @returns {'HSM'|'HBM'|'PTM'|'RESCHEDULE'} - The active department or RESCHEDULE period
 */
export function resolveDepartmentByDate(date) {
  const d = new Date(date);
  const day = d.getDate();

  if (day >= 1 && day <= 5) return 'HSM';
  if (day >= 6 && day <= 12) return 'HBM';
  if (day >= 13 && day <= 23) return 'PTM';
  return 'RESCHEDULE';
}

/**
 * Get the last day of a given month
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {number}
 */
export function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the date range for a department in a given month
 * @param {string} department - 'HSM'|'HBM'|'PTM'|'RESCHEDULE'
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {{startDay: number, endDay: number, startDate: Date, endDate: Date}}
 */
export function getDepartmentDateRange(department, year, month) {
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
export function isReschedulePeriod(date) {
  return resolveDepartmentByDate(date) === 'RESCHEDULE';
}

/**
 * Check if a date falls within a department's maintenance window
 * @param {Date|string} date
 * @param {string} departmentCode - 'HSM'|'HBM'|'PTM'
 * @returns {boolean}
 */
export function isInDepartmentWindow(date, departmentCode) {
  const activeDepartment = resolveDepartmentByDate(date);
  return activeDepartment === departmentCode || activeDepartment === 'RESCHEDULE';
}

/**
 * Generate the complete month schedule with department assignments
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {Array<{day: number, department: string, color: object, date: Date}>}
 */
export function getMonthSchedule(year, month) {
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
 * @returns {Object}
 */
export function getAllDepartmentWindows(year, month) {
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
export function hasWindowPassed(departmentCode, currentDate) {
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
export function isCurrentlyInWindow(departmentCode, currentDate = new Date()) {
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
 * @returns {Object}
 */
export function getCurrentWindowStatus(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const activeDepartment = resolveDepartmentByDate(d);
  const range = getDepartmentDateRange(activeDepartment, year, month);

  return {
    activeDepartment,
    year,
    month: month + 1, // Return 1-indexed month
    monthName: d.toLocaleString('default', { month: 'long' }),
    currentDay: d.getDate(),
    windowStart: range.startDay,
    windowEnd: range.endDay,
    windowStartDate: formatDateISO(range.startDate),
    windowEndDate: formatDateISO(range.endDate),
    isReschedule: activeDepartment === 'RESCHEDULE',
    color: DEPARTMENT_COLORS[activeDepartment]
  };
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
export function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get days remaining in current window
 * @param {Date} date
 * @returns {number}
 */
export function getDaysRemainingInWindow(date = new Date()) {
  const d = new Date(date);
  const department = resolveDepartmentByDate(d);
  const range = getDepartmentDateRange(department, d.getFullYear(), d.getMonth());
  return Math.max(0, range.endDay - d.getDate());
}

/**
 * Generate calendar grid data for rendering
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array<Array<{day: number|null, date: Date|null, department: string|null, isToday: boolean}>>}
 */
export function generateCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = getLastDayOfMonth(year, month);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = today.getDate();

  const weeks = [];
  let currentWeek = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ day: null, date: null, department: null, isToday: false });
  }

  // Add days of the month
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const department = resolveDepartmentByDate(date);

    currentWeek.push({
      day,
      date,
      department,
      color: DEPARTMENT_COLORS[department],
      isToday: isCurrentMonth && day === currentDay
    });

    // Start new week after Saturday
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add remaining empty cells to complete the last week
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push({ day: null, date: null, department: null, isToday: false });
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Get warning message for out-of-window inspection
 * @param {string} craneDepartment
 * @param {Date} inspectionDate
 * @returns {string|null}
 */
export function getWindowWarningMessage(craneDepartment, inspectionDate) {
  const date = new Date(inspectionDate);
  const activeDepartment = resolveDepartmentByDate(date);

  if (activeDepartment === craneDepartment) {
    return null; // No warning, in correct window
  }

  if (activeDepartment === 'RESCHEDULE') {
    return null; // No warning during reschedule period
  }

  const range = getDepartmentDateRange(
    craneDepartment,
    date.getFullYear(),
    date.getMonth()
  );

  const monthName = date.toLocaleString('default', { month: 'long' });

  return `This crane belongs to ${craneDepartment} department. The maintenance window for ${craneDepartment} is ${monthName} ${range.startDay}-${range.endDay}. You are currently in the ${activeDepartment} window.`;
}
