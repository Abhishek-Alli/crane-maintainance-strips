/**
 * ============================================
 * API SERVICE – FULL FINAL VERSION
 * ============================================
 * ✔ Supports ALL components
 * ✔ JWT handled via interceptor
 * ✔ Blob-safe for PDF / Excel
 * ✔ No duplicate exports
 * ✔ Stable & production-ready
 * ============================================
 */

import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

export const UPLOAD_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '') ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5001' : '');

export function resolveUploadUrl(urlOrPath) {
  if (!urlOrPath) return '';
  if (/^https?:\/\//i.test(urlOrPath) || urlOrPath.startsWith('blob:')) return urlOrPath;
  const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${UPLOAD_BASE_URL}${path}`;
}

/* =============================
   AXIOS INSTANCE
============================= */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* =============================
   REQUEST INTERCEPTOR (JWT)
============================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      // Let the browser set multipart boundary
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =============================
   RESPONSE INTERCEPTOR
============================= */
api.interceptors.response.use(
  (response) => {
    // IMPORTANT: do not unwrap blob responses
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }
    return Promise.reject(error.response?.data || error);
  }
);

/* =============================
   INSPECTION API
============================= */
export const inspectionAPI = {
  create: (data) => api.post('/inspections', data),
  getAll: (params) => api.get('/inspections', { params }),
  getById: (id) => api.get(`/inspections/${id}`),
  resendTelegram: (id) => api.post(`/inspections/${id}/resend-telegram`),
};

/* =============================
   FORM API
============================= */
export const formAPI = {
  getAll: () => api.get('/forms'),
  getById: (id) => api.get(`/forms/${id}`),
};

/* =============================
   CONFIG API
============================= */

export const configAPI = {
  getDepartments: () =>
    api.get('/departments'),

  getSheds: (params) =>
    api.get('/config/sheds', { params }),

  getSubDepartments: (departmentId) =>
    api.get('/config/sub-departments', {
      params: { department_id: departmentId }
    })
};
export const inspectionSectionAPI = {
  getByForm: (formId) =>
    api.get(`/inspection-sections/form/${formId}`),

  getByDepartment: (params) =>
    api.get('/inspection-sections/by-department', { params })
};

export const inspectionItemAPI = {
  getBySection: (sectionId) =>
    api.get(`/inspection-items/section/${sectionId}`)
};


/* =============================
   CRANE API
============================= */
export const craneAPI = {
  getAll: (params) => api.get('/cranes', { params }),
  getByShed: (shedId) => api.get(`/cranes/shed/${shedId}`),
};

/* =============================
   MAINTENANCE SCHEDULE API
============================= */
export const maintenanceScheduleAPI = {
  getCalendar: (year, month) =>
    api.get('/maintenance-schedule/calendar', {
      params: { year, month },
    }),

  getDepartmentStatus: (departmentCode, year, month) =>
    api.get('/maintenance-schedule/status', {
      params: { department_code: departmentCode, year, month },
    }),

  getRescheduleCranes: (year, month) =>
    api.get('/maintenance-schedule/reschedule', {
      params: { year, month },
    }),

  getActiveWindow: () =>
    api.get('/maintenance-schedule/active-window'),

  checkWindow: (craneId, inspectionDate) =>
    api.get('/maintenance-schedule/check-window', {
      params: { crane_id: craneId, inspection_date: inspectionDate },
    }),

  getCraneStatus: (craneId, year, month) =>
    api.get(`/maintenance-schedule/crane/${craneId}`, {
      params: { year, month },
    }),

  markStatus: (craneId, year, month, status, notes) =>
    api.post('/maintenance-schedule/mark-status', {
      crane_id: craneId,
      year,
      month,
      status,
      notes,
    }),

  initializeMonth: (year, month) =>
    api.post('/maintenance-schedule/initialize', { year, month }),

  updateExpiredStatuses: () =>
    api.post('/maintenance-schedule/update-expired'),
};

/* =============================
   REPORT API
============================= */
export const reportAPI = {
  getPreview: (params) =>
    api.get('/reports/preview', { params }),

  exportExcel: (data) =>
    api.post('/reports/export/excel', data, {
      responseType: 'blob',
    }),

  exportPDF: (data) =>
    api.post('/reports/export/pdf', data, {
      responseType: 'blob',
    }),
};

/* =============================
   TELEGRAM API
============================= */
export const telegramAPI = {
  getRecipients: () => api.get('/telegram/recipients'),
  addRecipient: (data) => api.post('/telegram/recipients', data),
  toggleRecipient: (id) => api.put(`/telegram/recipients/${id}/toggle`),
  updateRecipientChecksheets: (id, checksheet_types) => api.put(`/telegram/recipients/${id}/checksheets`, { checksheet_types }),
  deleteRecipient: (id) => api.delete(`/telegram/recipients/${id}`),
  sendTest: (data) => api.post('/telegram/test', data),
};

/* =============================
   HBM API
============================= */
export const hbmAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/hbm/dashboard/stats'),
  getRecentChecksheets: (limit) => api.get('/hbm/dashboard/recent', { params: { limit } }),

  // Machines
  getMachines: (params) => api.get('/hbm/machines', { params }),
  getMachineById: (id) => api.get(`/hbm/machines/${id}`),
  createMachine: (data) => api.post('/hbm/machines', data),
  updateMachine: (id, data) => api.put(`/hbm/machines/${id}`, data),
  deleteMachine: (id) => api.delete(`/hbm/machines/${id}`),

  // Machine templates
  getMachineTemplates: (machineId) => api.get(`/hbm/machines/${machineId}/templates`),
  assignTemplate: (machineId, templateId) => api.post(`/hbm/machines/${machineId}/templates`, { template_id: templateId }),

  // Checksheet templates
  getTemplates: () => api.get('/hbm/templates'),
  getTemplateById: (id) => api.get(`/hbm/templates/${id}`),

  // Universal checksheets (template-based)
  getChecksheets: (params) => api.get('/hbm/checksheets', { params }),
  getChecksheetById: (id) => api.get(`/hbm/checksheets/${id}`),
  createChecksheet: (data) => api.post('/hbm/checksheets', data),

  // DC Motor logs
  getDcMotorLogs: (params) => api.get('/hbm/dc-motor', { params }),
  getDcMotorLogById: (id) => api.get(`/hbm/dc-motor/${id}`),
  createDcMotorLog: (data) => api.post('/hbm/dc-motor', data),

  // Rolling Stand logs
  getRollingStandLogs: (params) => api.get('/hbm/rolling-stand', { params }),
  getRollingStandLogById: (id) => api.get(`/hbm/rolling-stand/${id}`),
  createRollingStandLog: (data) => api.post('/hbm/rolling-stand', data),

  // Mill Mechanical logs
  getMillMechLogs: (params) => api.get('/hbm/mill-mech', { params }),
  getMillMechLogById: (id) => api.get(`/hbm/mill-mech/${id}`),
  createMillMechLog: (data) => api.post('/hbm/mill-mech', data),

  // Cooling Bed logs
  getCoolingBedLogs: (params) => api.get('/hbm/cooling-bed', { params }),
  getCoolingBedLogById: (id) => api.get(`/hbm/cooling-bed/${id}`),
  createCoolingBedLog: (data) => api.post('/hbm/cooling-bed', data),

  // Pumphouse logs
  getPumpHouseLogs: (params) => api.get('/hbm/pumphouse', { params }),
  getPumpHouseLogById: (id) => api.get(`/hbm/pumphouse/${id}`),
  createPumpHouseLog: (data) => api.post('/hbm/pumphouse', data),

  // Bar Bundle Area logs
  getBarBundleLogs: (params) => api.get('/hbm/bar-bundle', { params }),
  getBarBundleLogById: (id) => api.get(`/hbm/bar-bundle/${id}`),
  createBarBundleLog: (data) => api.post('/hbm/bar-bundle', data),

  // Before Rolling logs
  getBeforeRollingLogs: (params) => api.get('/hbm/before-rolling', { params }),
  getBeforeRollingLogById: (id) => api.get(`/hbm/before-rolling/${id}`),
  createBeforeRollingLog: (data) => api.post('/hbm/before-rolling', data),

  // Pump Parameter Report logs
  getPumpParamLogs: (params) => api.get('/hbm/pump-param', { params }),
  getPumpParamLogById: (id) => api.get(`/hbm/pump-param/${id}`),
  createPumpParamLog: (data) => api.post('/hbm/pump-param', data),

  // Visual Inspection & HBM Transformer logs
  getTransformerLogs: (params) => api.get('/hbm/transformer', { params }),
  getTransformerLogById: (id) => api.get(`/hbm/transformer/${id}`),
  createTransformerLog: (data) => api.post('/hbm/transformer', data),
  downloadTransformerPDF: (id) => api.get(`/hbm/transformer/${id}/pdf`, { responseType: 'blob' }),

  // Pump House Maintenance Work Sheet logs
  getPhMaintLogs: (params) => api.get('/hbm/ph-maint', { params }),
  getPhMaintLogById: (id) => api.get(`/hbm/ph-maint/${id}`),
  createPhMaintLog: (data) => api.post('/hbm/ph-maint', data),
  downloadPhMaintPDF: (id) => api.get(`/hbm/ph-maint/${id}/pdf`, { responseType: 'blob' }),

  // Pump House Water Parameter logs
  getWaterParamLogs: (params) => api.get('/hbm/water-param', { params }),
  getWaterParamLogById: (id) => api.get(`/hbm/water-param/${id}`),
  createWaterParamLog: (data) => api.post('/hbm/water-param', data),
  downloadWaterParamPDF: (id) => api.get(`/hbm/water-param/${id}/pdf`, { responseType: 'blob' }),

  // Daily Oil Level Sheet logs
  getOilLevelLogs: (params) => api.get('/hbm/oil-level', { params }),
  getOilLevelLogById: (id) => api.get(`/hbm/oil-level/${id}`),
  createOilLevelLog: (data) => api.post('/hbm/oil-level', data),

  // DC Motor Airflow, Temperature & Vibration Report logs
  getDcMotorAirflowLogs: (params) => api.get('/hbm/dc-motor-airflow', { params }),
  getDcMotorAirflowLogById: (id) => api.get(`/hbm/dc-motor-airflow/${id}`),
  createDcMotorAirflowLog: (data) => api.post('/hbm/dc-motor-airflow', data),

  // Roughing Stand & Gearbox Bearing Temperature
  getRoughingGbTempLogs: (params) => api.get('/hbm/roughing-gb-temp', { params }),
  getRoughingGbTempLogById: (id) => api.get(`/hbm/roughing-gb-temp/${id}`),
  createRoughingGbTempLog: (data) => api.post('/hbm/roughing-gb-temp', data),

  // HBM Breakdown Report
  getBreakdownLogs: (params) => api.get('/hbm/breakdown', { params }),
  getBreakdownLogById: (id) => api.get(`/hbm/breakdown/${id}`),
  createBreakdownLog: (data) => api.post('/hbm/breakdown', data),
  downloadBreakdownPDF: (id) => api.get(`/hbm/breakdown/${id}/pdf`, { responseType: 'blob' }),

  // PDF downloads
  downloadPDF: (type, id) =>
    api.get(`/hbm/pdf/${type}/${id}`, { responseType: 'blob' }),

  // Delete a log entry (admin only)
  deleteLog: (type, id) => api.delete(`/hbm/${type}/${id}`),

  // Resend Telegram notification
  resendTelegram: (type, id) => api.post(`/hbm/${type}/${id}/resend-telegram`),

  // Send notifications for all filled sheets on a given date
  sendDailyNotifications: (date) => api.post('/hbm/send-daily-notifications', { date }),

  // Send daily status summary (filled / prev date / not filled)
  sendStatusSummary: (date) => api.post('/hbm/send-status-summary', { date }),

  // Sheet Viewer — flat rows for any sheet type
  getSheetView: (type, params) => api.get(`/hbm/sheet-view/${type}`, { params }),

  // Monthly Insights
  getMonthlyInsights: (params) => api.get('/hbm/monthly-insights', { params }),
  getMonthlyDetail: (type, params) => api.get(`/hbm/monthly-detail/${type}`, { params }),
  getMonthlyRegister: (type, params) => api.get(`/hbm/monthly-register/${type}`, { params }),
};

/* =============================
   USER API
============================= */
export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users/create', data),
  delete: (id) => api.delete(`/users/${id}`),
  getPermissions: (id) => api.get(`/users/${id}/hbm-permissions`),
  updatePermissions: (id, data) => api.put(`/users/${id}/hbm-permissions`, data),
  getCranePermissions: (id) => api.get(`/users/${id}/crane-permissions`),
  updateCranePermissions: (id, data) => api.put(`/users/${id}/crane-permissions`, data),
  changePassword: (id, password) => api.put(`/users/${id}`, { password }),
  changeModule: (id, user_type) => api.put(`/users/${id}`, { user_type }),
};

export const permissionListsAPI = {
  getAll: (module_code) => api.get('/permission-lists' + (module_code ? `?module_code=${module_code}` : '')),
  create: (data) => api.post('/permission-lists', data),
  update: (id, data) => api.put(`/permission-lists/${id}`, data),
  delete: (id) => api.delete(`/permission-lists/${id}`),
};

export const pumpHouseAPI = {
  getLocations: () =>
    api.get("/pumphouse/locations"),

  saveReading: (data) =>
    api.post("/pumphouse/readings", data),

  saveWithPDF: (data) =>
    api.post("/pumphouse/readings-with-pdf", data, {
      responseType: "blob",
    }),
};

// PumpHouse
export const getPumpLocations = () =>
  api.get("/api/pumphouse/locations");

export const savePumpReadings = (data) =>
  api.post("/api/pumphouse/readings", data);




/* =============================
   PTM API
============================= */
export const ptmAPI = {
  getDashboard: () => api.get('/ptm/dashboard'),
  getTemplates: () => api.get('/ptm/templates'),
  getTemplateById: (id) => api.get(`/ptm/templates/${id}`),
  createTemplate: (data) => api.post('/ptm/templates', data),
  updateTemplate: (id, data) => api.put(`/ptm/templates/${id}`, data),
  addItem: (templateId, data) => api.post(`/ptm/templates/${templateId}/items`, data),
  updateItem: (templateId, itemId, data) => api.put(`/ptm/templates/${templateId}/items/${itemId}`, data),
  deleteItem: (templateId, itemId) => api.delete(`/ptm/templates/${templateId}/items/${itemId}`),
  getLogs: (params) => api.get('/ptm/logs', { params }),
  getLogById: (id) => api.get(`/ptm/logs/${id}`),
  createLog: (data) => api.post('/ptm/logs', data),
  getMonthlyRegister: (templateId, params) => api.get(`/ptm/monthly-register/${templateId}`, { params }),
  getBreakdownLogs: (params) => api.get('/ptm/breakdown', { params }),
  getBreakdownReasons: (q) => api.get('/ptm/breakdown-reasons', { params: { q } }),
  getBreakdownLogById: (id) => api.get(`/ptm/breakdown/${id}`),
  createBreakdownLog: (data) => api.post('/ptm/breakdown', data),

  // Config
  getMills: () => api.get('/ptm/config/mills'),
  createMill: (data) => api.post('/ptm/config/mills', data),
  updateMill: (id, data) => api.put(`/ptm/config/mills/${id}`, data),
  deleteMill: (id) => api.delete(`/ptm/config/mills/${id}`),

  getBreakdownTypes: () => api.get('/ptm/config/breakdown-types'),
  createBreakdownType: (data) => api.post('/ptm/config/breakdown-types', data),
  updateBreakdownType: (id, data) => api.put(`/ptm/config/breakdown-types/${id}`, data),
  deleteBreakdownType: (id) => api.delete(`/ptm/config/breakdown-types/${id}`),

  getSizes: () => api.get('/ptm/config/sizes'),
  createSize: (data) => api.post('/ptm/config/sizes', data),
  updateSize: (id, data) => api.put(`/ptm/config/sizes/${id}`, data),
  deleteSize: (id) => api.delete(`/ptm/config/sizes/${id}`),
};

/* =============================
   SMS API
============================= */
export const smsAPI = {
  getBreakdownAnalysisLogs: (params) => api.get('/sms/breakdown-analysis', { params }),
  getBreakdownAnalysisById: (id) => api.get(`/sms/breakdown-analysis/${id}`),
  createBreakdownAnalysis: (data) => api.post('/sms/breakdown-analysis', data),
  updateBreakdownAnalysis: (id, data) => api.put(`/sms/breakdown-analysis/${id}`, data),
  deleteBreakdownAnalysis: (id) => api.delete(`/sms/breakdown-analysis/${id}`),
  downloadBreakdownAnalysisPDF: (id) =>
    api.get(`/sms/breakdown-analysis/${id}/pdf`, { responseType: 'blob' }),
};

/* =============================
   HSM API
============================= */
export const hsmAPI = {
  getInsights: (params) => api.get('/hsm/insights', { params }),

  getBreakdownAnalysisLogs: (params) => api.get('/hsm/breakdown-analysis', { params }),
  getBreakdownAnalysisById: (id) => api.get(`/hsm/breakdown-analysis/${id}`),
  createBreakdownAnalysis: (data) => api.post('/hsm/breakdown-analysis', data),
  updateBreakdownAnalysis: (id, data) => api.put(`/hsm/breakdown-analysis/${id}`, data),
  deleteBreakdownAnalysis: (id) => api.delete(`/hsm/breakdown-analysis/${id}`),
  clearAllBreakdownAnalysis: () => api.delete('/hsm/breakdown-analysis/clear-all'),
  downloadBreakdownAnalysisPDF: (id) =>
    api.get(`/hsm/breakdown-analysis/${id}/pdf`, { responseType: 'blob' }),

  getRollChangeActivityLogs: (params) => api.get('/hsm/roll-change-activity', { params }),
  getRollChangeActivityById: (id) => api.get(`/hsm/roll-change-activity/${id}`),
  createRollChangeActivity: (data) => api.post('/hsm/roll-change-activity', data),
  updateRollChangeActivity: (id, data) => api.put(`/hsm/roll-change-activity/${id}`, data),
  deleteRollChangeActivity: (id) => api.delete(`/hsm/roll-change-activity/${id}`),
  clearAllRollChangeActivity: () => api.delete('/hsm/roll-change-activity/clear-all'),
  downloadRollChangeActivityPDF: (id) =>
    api.get(`/hsm/roll-change-activity/${id}/pdf`, { responseType: 'blob' }),

  getDelayReportLogs: (params) => api.get('/hsm/delay-report', { params }),
  getDelayReportById: (id) => api.get(`/hsm/delay-report/${id}`),
  createDelayReport: (data) => api.post('/hsm/delay-report', data),
  updateDelayReport: (id, data) => api.put(`/hsm/delay-report/${id}`, data),
  deleteDelayReport: (id) => api.delete(`/hsm/delay-report/${id}`),
  clearAllDelayReports: () => api.delete('/hsm/delay-report/clear-all'),
  downloadDelayReportPDF: (id) =>
    api.get(`/hsm/delay-report/${id}/pdf`, { responseType: 'blob' }),
  downloadDelayReportTemplate: () =>
    api.get('/hsm/delay-report/template', { responseType: 'blob' }),
  importDelayReports: (formData) => api.post('/hsm/delay-report/import', formData),
};

/* =============================
   MODULES API
============================= */
export const modulesAPI = {
  getAll: () => api.get('/modules'),
  create: (data) => api.post('/modules', data),
  update: (id, data) => api.put(`/modules/${id}`, data),
  delete: (id) => api.delete(`/modules/${id}`),
};

export default api;
