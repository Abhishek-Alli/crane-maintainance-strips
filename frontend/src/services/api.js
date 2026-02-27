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

  // Templates
  getTemplates: () => api.get('/hbm/templates'),
  getTemplateById: (id) => api.get(`/hbm/templates/${id}`),

  // Checksheets
  getChecksheets: (params) => api.get('/hbm/checksheets', { params }),
  getChecksheetById: (id) => api.get(`/hbm/checksheets/${id}`),
  createChecksheet: (data) => api.post('/hbm/checksheets', data),
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
   EXPORT AXIOS INSTANCE
============================= */
export default api;
