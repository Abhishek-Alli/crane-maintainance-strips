/** Edit/delete allowed only within 10 hours of submission */
export const EDIT_WINDOW_MS = 10 * 60 * 60 * 1000;

export function isWithinEditWindow(createdAt) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= EDIT_WINDOW_MS;
}

export function hoursLeftInEditWindow(createdAt) {
  if (!createdAt) return 0;
  const left = EDIT_WINDOW_MS - (Date.now() - new Date(createdAt).getTime());
  return Math.max(0, left / (60 * 60 * 1000));
}

export function editWindowLabel(createdAt) {
  if (!createdAt) return '';
  if (!isWithinEditWindow(createdAt)) {
    return 'Edit/delete window closed (10 hours after submission)';
  }
  const hrs = hoursLeftInEditWindow(createdAt);
  if (hrs >= 1) {
    return `Editable for ~${Math.ceil(hrs)} more hour${Math.ceil(hrs) === 1 ? '' : 's'}`;
  }
  const mins = Math.max(1, Math.ceil(hrs * 60));
  return `Editable for ~${mins} more minute${mins === 1 ? '' : 's'}`;
}
