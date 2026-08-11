/** Edit/delete allowed only within this window after created_at */
const EDIT_WINDOW_MS = 10 * 60 * 60 * 1000; // 10 hours

function isWithinEditWindow(createdAt) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= EDIT_WINDOW_MS;
}

function editWindowDeniedMessage() {
  return 'Edit/delete allowed only within 10 hours of submission';
}

module.exports = {
  EDIT_WINDOW_MS,
  isWithinEditWindow,
  editWindowDeniedMessage,
};
