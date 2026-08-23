const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const {
  CHECK_ITEMS,
  GUIDE_CENTERLINE_KEYS,
  nullIfEmpty,
  normalizeChecklistItems,
  normalizeGuideCenterline,
} = require('../utils/hsmFmDailyConfig');

const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');

function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(s) {
  if (s === 'OK') return 'OK';
  if (s === 'NOT_OK') return 'NOT OK';
  return '—';
}

class HsmFmDailyController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, limit } = req.query;
      const conditions = [];
      const params = [];

      if (date_from) {
        params.push(date_from);
        conditions.push(`l.report_date >= $${params.length}::date`);
      }
      if (date_to) {
        params.push(date_to);
        conditions.push(`l.report_date <= $${params.length}::date`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hsm_fm_daily_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM hsm_fm_daily_checklists l
         ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('HSM FM Daily getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch FM Daily checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hsm_fm_daily_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'FM Daily checklist not found' });
      }
      const row = result.rows[0];
      res.json({
        success: true,
        data: {
          ...row,
          can_modify: isWithinEditWindow(row.created_at),
        },
      });
    } catch (error) {
      console.error('HSM FM Daily getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch FM Daily checklist' });
    }
  }

  static _validate(b) {
    if (!b.report_date) return 'Date is required';
    if (!b.shift || !['A', 'B', 'C'].includes(String(b.shift).toUpperCase())) {
      return 'Shift must be A, B, or C';
    }
    return null;
  }

  static async create(req, res) {
    try {
      const b = req.body || {};
      const err = HsmFmDailyController._validate(b);
      if (err) return res.status(400).json({ success: false, message: err });

      const items = normalizeChecklistItems(b.checklist_items);
      const guide = normalizeGuideCenterline(b.guide_centerline);

      const result = await query(
        `INSERT INTO hsm_fm_daily_checklists (
           report_date, shift, shift_engineer, checklist_items, guide_centerline, note, filled_by
         ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)
         RETURNING *`,
        [
          b.report_date,
          String(b.shift).toUpperCase(),
          nullIfEmpty(b.shift_engineer),
          JSON.stringify(items),
          JSON.stringify(guide),
          nullIfEmpty(b.note),
          req.user.id,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'FM Daily checklist saved',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('HSM FM Daily create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save FM Daily checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM hsm_fm_daily_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'FM Daily checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }

      const b = req.body || {};
      const err = HsmFmDailyController._validate(b);
      if (err) return res.status(400).json({ success: false, message: err });

      const items = normalizeChecklistItems(b.checklist_items);
      const guide = normalizeGuideCenterline(b.guide_centerline);

      const result = await query(
        `UPDATE hsm_fm_daily_checklists SET
           report_date = $1, shift = $2, shift_engineer = $3,
           checklist_items = $4::jsonb, guide_centerline = $5::jsonb, note = $6,
           updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          b.report_date,
          String(b.shift).toUpperCase(),
          nullIfEmpty(b.shift_engineer),
          JSON.stringify(items),
          JSON.stringify(guide),
          nullIfEmpty(b.note),
          id,
        ]
      );

      res.json({
        success: true,
        message: 'FM Daily checklist updated',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('HSM FM Daily update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update FM Daily checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM hsm_fm_daily_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'FM Daily checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM hsm_fm_daily_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'FM Daily checklist deleted' });
    } catch (error) {
      console.error('HSM FM Daily delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete FM Daily checklist' });
    }
  }

  static async clearAll(req, res) {
    try {
      const result = await query(`DELETE FROM hsm_fm_daily_checklists RETURNING id`);
      res.json({
        success: true,
        message: `Deleted ${result.rowCount} FM Daily checklist(s)`,
        deleted: result.rowCount,
      });
    } catch (error) {
      console.error('HSM FM Daily clearAll error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete all FM Daily history' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hsm_fm_daily_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'FM Daily checklist not found' });
      }
      const log = result.rows[0];
      const items = log.checklist_items || {};
      const guide = log.guide_centerline || {};

      const margin = 28;
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 20, bottom: 24, left: margin, right: margin },
        bufferPages: true,
      });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=hsm_fm_daily_checklist_${id}_${log.report_date || 'report'}.pdf`
      );

      const pageW = doc.page.width - margin * 2;
      let y = 24;

      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, margin, y, { width: 52 });
        } catch (_) { /* ignore */ }
      }
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e1b4b')
        .text('FM Daily Check List', margin + 60, y + 8, { width: pageW - 60 });
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text('HSM Checksheets', margin + 60, y + 28, { width: pageW - 60 });
      y = 70;

      const meta = [
        ['Date', formatDateOnly(log.report_date)],
        ['Shift', log.shift || '—'],
        ['Shift Engineer', log.shift_engineer || '—'],
        ['Filled by', log.filled_by_name || '—'],
      ];
      meta.forEach(([k, v]) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(`${k}:`, margin, y, { continued: true });
        doc.font('Helvetica').fillColor('#0f172a').text(` ${v}`);
        y += 14;
      });
      y += 8;

      // Guide centerline block
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81')
        .text('All guide centerline should be check', margin, y);
      y += 16;
      GUIDE_CENTERLINE_KEYS.forEach(({ key, label }) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 30;
        }
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
          .text(`${label}:`, margin, y, { width: 70, continued: false });
        doc.font('Helvetica').fontSize(8).fillColor('#0f172a')
          .text(guide[key] || '—', margin + 74, y, { width: pageW - 74 });
        y += 13;
      });
      y += 10;

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81')
        .text('Checklist items', margin, y);
      y += 14;

      CHECK_ITEMS.forEach(({ key, label }, idx) => {
        if (y > doc.page.height - 70) {
          doc.addPage();
          y = 30;
        }
        const row = items[key] || {};
        const st = statusLabel(row.status);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
          .text(`${idx + 1}. ${label}`, margin, y, { width: pageW });
        y = doc.y + 2;
        doc.font('Helvetica').fontSize(8).fillColor('#334155')
          .text(`Status: ${st}`, margin + 8, y, { continued: true });
        doc.text(`   Remark: ${row.remark || '—'}`);
        y = doc.y + 8;
      });

      if (log.note) {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 30;
        }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81').text('Note', margin, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a')
          .text(log.note, margin, y, { width: pageW });
      }

      doc.end();
      await new Promise((resolve) => doc.on('end', resolve));
      res.end(Buffer.concat(buffers));
    } catch (error) {
      console.error('HSM FM Daily PDF error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    }
  }
}

module.exports = HsmFmDailyController;
