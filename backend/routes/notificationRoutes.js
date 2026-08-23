const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

// GET /api/notifications — list notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const r = await query(
      `SELECT id, title, body, url, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    const unread = await query(
      'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, data: r.rows, unreadCount: parseInt(unread.rows[0].cnt) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

// POST /api/notifications/send — admin sends manual notification to users
router.post('/send', authenticate, async (req, res) => {
  try {
    const role = (req.user.role_name || req.user.role || '').toUpperCase();
    const type = (req.user.user_type || '').toUpperCase();
    if (role !== 'ADMIN' && type !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { title, body, url, user_ids } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title required' });

    // Resolve target user IDs
    let targetIds = [];
    if (!user_ids || user_ids === 'all') {
      const r = await query('SELECT id FROM users WHERE is_active = true');
      targetIds = r.rows.map(r => r.id);
    } else if (Array.isArray(user_ids)) {
      targetIds = user_ids.map(Number).filter(Boolean);
    }
    if (!targetIds.length) return res.status(400).json({ success: false, message: 'No target users' });

    // Save to DB
    const { saveNotifications } = require('../utils/notificationService');
    await saveNotifications(targetIds, { title, body: body || '', url: url || '/' });

    // Send push
    const { sendPush } = require('../utils/firebase');
    const tokRows = await query('SELECT token FROM fcm_tokens WHERE user_id = ANY($1)', [targetIds]);
    const tokens = tokRows.rows.map(r => r.token);
    let pushed = 0;
    if (tokens.length) {
      const result = await sendPush(tokens, { title, body: body || '', url: url || '/' });
      pushed = result?.successCount || 0;
    }

    res.json({ success: true, message: `Sent to ${targetIds.length} users (${pushed} push delivered)` });
  } catch (err) {
    console.error('Admin send notification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send' });
  }
});

// POST /api/notifications/token — save FCM token for current user
router.post('/token', authenticate, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'token required' });
  try {
    await query(
      `INSERT INTO fcm_tokens (user_id, token, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()`,
      [req.user.id, token]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save FCM token error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save token' });
  }
});

// DELETE /api/notifications/token — remove token on logout
router.delete('/token', authenticate, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'token required' });
  try {
    await query('DELETE FROM fcm_tokens WHERE user_id = $1 AND token = $2', [req.user.id, token]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove token' });
  }
});

module.exports = router;
