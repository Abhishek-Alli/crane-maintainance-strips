// Telegram Recipients Controller – CRUD + Test

const { query } = require('../config/database');
const { sendTestMessage, sendTelegramMessage } = require('../utils/telegram');

class TelegramController {

  // GET /api/telegram/recipients
  static async getRecipients(req, res) {
    try {
      const { rows } = await query(
        'SELECT id, chat_id, label, is_active, created_at FROM telegram_recipients ORDER BY created_at DESC'
      );
      res.json({ success: true, recipients: rows });
    } catch (error) {
      console.error('Get recipients error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/telegram/recipients
  static async addRecipient(req, res) {
    try {
      const { chat_id, label } = req.body;

      if (!chat_id || !label) {
        return res.status(400).json({ success: false, message: 'chat_id and label are required' });
      }

      const { rows } = await query(
        'INSERT INTO telegram_recipients (chat_id, label) VALUES ($1, $2) RETURNING *',
        [chat_id.trim(), label.trim()]
      );

      res.status(201).json({ success: true, recipient: rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'This Chat ID already exists' });
      }
      console.error('Add recipient error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/telegram/recipients/:id/toggle
  static async toggleRecipient(req, res) {
    try {
      const { id } = req.params;
      const { rows } = await query(
        'UPDATE telegram_recipients SET is_active = NOT is_active WHERE id = $1 RETURNING *',
        [parseInt(id, 10)]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }

      res.json({ success: true, recipient: rows[0] });
    } catch (error) {
      console.error('Toggle recipient error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/telegram/recipients/:id
  static async deleteRecipient(req, res) {
    try {
      const { id } = req.params;
      const { rowCount } = await query(
        'DELETE FROM telegram_recipients WHERE id = $1',
        [parseInt(id, 10)]
      );

      if (rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }

      res.json({ success: true, message: 'Recipient deleted' });
    } catch (error) {
      console.error('Delete recipient error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/telegram/test
  static async sendTest(req, res) {
    try {
      const { chat_id } = req.body;
      const result = await sendTestMessage(chat_id || undefined);

      if (result) {
        res.json({ success: true, message: 'Test message sent' });
      } else {
        res.status(400).json({ success: false, message: 'Failed to send test message. Check Chat ID.' });
      }
    } catch (error) {
      console.error('Test message error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/telegram/broadcast – manual test broadcast to all recipients
  static async broadcast(req, res) {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, message: 'message is required' });
      }
      const results = await sendTelegramMessage(message);
      const sent = results.filter(Boolean).length;
      res.json({ success: true, sent, total: results.length });
    } catch (error) {
      console.error('Broadcast error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = TelegramController;
