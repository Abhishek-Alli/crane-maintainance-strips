/** SMS DG check sheet — keep in sync with backend/controllers/smsDgController.js */

export const DIESEL_REFILL_OPTIONS = ['YES', 'NO'];
export const AIR_CLEANING_OPTIONS = ['DONE', 'PREVIOUSLY DONE'];

export function emptyDgForm() {
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    diesel_refill: '',
    diesel_refill_remark: '',
    air_cleaning: '',
    running_hours: '',
    running_hours_remark: '',
    remark: '',
  };
}
