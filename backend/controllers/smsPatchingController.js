const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const {
  PATCHING_DEPARTMENT_NAME,
  PATCHING_FURNACES,
  PATCHING_CRUCIBLES,
  PATCHING_POINTS,
  pointLabel,
  nullIfEmpty,
  hasValue,
  isAlert,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
} = require('../utils/smsPatchingConfig');

const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

class SmsPatchingController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, crucible, limit } = req.query;
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
      if (crucible) {
        params.push(String(crucible));
        conditions.push(`l.crucible = $${params.length}`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.id, l.report_date, l.recorded_by, l.furnace, l.crucible, l.alert_count, l.created_at,
                l.checklist_items->'air_pressure'->>'value' AS air_pressure,
                u.username AS filled_by_name
         FROM sms_patching_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_patching_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Patching getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch patching checklists' });
    }
  }

  static async _fetchLog(id) {
    const result = await query(
      `SELECT l.*, u.username AS filled_by_name
       FROM sms_patching_checklists l
       JOIN users u ON l.filled_by = u.id
       WHERE l.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async getById(req, res) {
    try {
      const log = await SmsPatchingController._fetchLog(req.params.id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Patching checklist not found' });
      }
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS Patching getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch patching checklist' });
    }
  }

  /** Validates the body. Returns { error } or { header, items, alertCount }. */
  static _prepare(b) {
    if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
    const recordedBy = nullIfEmpty(b.recorded_by);
    if (!recordedBy) return { error: 'Recorded By is required' };
    if (!PATCHING_FURNACES.includes(b.furnace)) return { error: 'Furnace is required' };
    if (!PATCHING_CRUCIBLES.includes(String(b.crucible || ''))) return { error: 'Crucible No. is required' };

    const items = normalizeChecklistItems(b.checklist_items);
    const error = findChecklistError(items);
    if (error) return { error };

    return {
      header: {
        report_date: b.report_date,
        recorded_by: recordedBy,
        furnace: b.furnace,
        crucible: String(b.crucible),
        general_remark: nullIfEmpty(b.general_remark),
      },
      items,
      alertCount: countAlerts(items),
    };
  }

  static async create(req, res) {
    try {
      const prep = SmsPatchingController._prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const h = prep.header;

      const result = await query(
        `INSERT INTO sms_patching_checklists (
           report_date, recorded_by, furnace, crucible, checklist_items, alert_count, general_remark, filled_by
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
         RETURNING id`,
        [
          h.report_date, h.recorded_by, h.furnace, h.crucible,
          JSON.stringify(prep.items), prep.alertCount, h.general_remark, req.user.id,
        ]
      );

      res.status(201).json({ success: true, message: 'Patching checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Patching create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save patching checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_patching_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Patching checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }

      const prep = SmsPatchingController._prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const h = prep.header;

      const result = await query(
        `UPDATE sms_patching_checklists SET
           report_date = $1, recorded_by = $2, furnace = $3, crucible = $4, checklist_items = $5::jsonb,
           alert_count = $6, general_remark = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id`,
        [
          h.report_date, h.recorded_by, h.furnace, h.crucible,
          JSON.stringify(prep.items), prep.alertCount, h.general_remark, id,
        ]
      );

      res.json({ success: true, message: 'Patching checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Patching update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update patching checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_patching_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Patching checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_patching_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Patching checklist deleted' });
    } catch (error) {
      console.error('SMS Patching delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete patching checklist' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const log = await SmsPatchingController._fetchLog(id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Patching checklist not found' });
      }
      const items = log.checklist_items || {};

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
        `attachment; filename=sms_patching_${id}_${log.report_date || 'report'}.pdf`
      );

      const pageW = doc.page.width - margin * 2;
      const pageBottom = doc.page.height - 40;
      let y = 24;

      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, margin, y, { width: 52 });
        } catch (_) { /* ignore */ }
      }
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#78350f')
        .text('Patching Check Sheet', margin + 60, y + 8, { width: pageW - 60 });
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(`SMS Checksheets · ${PATCHING_DEPARTMENT_NAME}`, margin + 60, y + 28, { width: pageW - 60 });
      y = 70;

      const meta = [
        ['Date', formatDateOnly(log.report_date)],
        ['Furnace', log.furnace || '—'],
        ['Crucible No.', log.crucible || '—'],
        ['Recorded By', log.recorded_by || '—'],
        ['Filled by', log.filled_by_name || '—'],
        ['Alerts', String(log.alert_count ?? 0)],
      ];
      meta.forEach(([k, v]) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(`${k}:`, margin, y, { continued: true });
        doc.font('Helvetica').fillColor('#0f172a').text(` ${v}`);
        y += 14;
      });
      y += 8;

      const cols = [
        { label: '#', w: 22 },
        { label: 'Check Point', w: 190 },
        { label: 'Status', w: 85 },
        { label: 'Remark', w: pageW - 22 - 190 - 85 },
      ];
      const pad = 4;

      const drawColumnHeader = () => {
        doc.rect(margin, y, pageW, 16).fill('#fef3c7');
        let x = margin;
        cols.forEach((c) => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#78350f')
            .text(c.label, x + pad, y + 4, { width: c.w - pad * 2, lineBreak: false });
          x += c.w;
        });
        y += 16;
      };

      drawColumnHeader();
      PATCHING_POINTS.forEach((p, pIdx) => {
        const row = items[p.key] || {};
        const alert = isAlert(p, row.value);
        const filled = hasValue(row.value);
        const status = filled ? `${row.value}${p.type === 'number' ? ` ${p.unit}` : ''}` : '—';
        const cells = [String(pIdx + 1), pointLabel(p), status, row.remark || '—'];
        doc.font('Helvetica').fontSize(8);
        const h = Math.max(...cells.map((t, i) => doc.heightOfString(t, { width: cols[i].w - pad * 2 }))) + pad * 2;
        if (y + h > pageBottom) {
          doc.addPage();
          y = 30;
          drawColumnHeader();
        }
        if (alert) doc.rect(margin, y, pageW, h).fill('#fef2f2');
        let x = margin;
        cells.forEach((t, i) => {
          const isStatus = i === 2;
          doc.font(isStatus ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
            .fillColor(isStatus ? (alert ? '#b91c1c' : filled ? '#047857' : '#6b7280') : '#0f172a')
            .text(t, x + pad, y + pad, { width: cols[i].w - pad * 2 });
          x += cols[i].w;
        });
        y += h;
        doc.moveTo(margin, y).lineTo(margin + pageW, y).lineWidth(0.5).stroke('#e5e7eb');
      });
      y += 12;

      if (log.general_remark) {
        if (y + 40 > pageBottom) {
          doc.addPage();
          y = 30;
        }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#78350f').text('Remark', margin, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(log.general_remark, margin, y, { width: pageW });
      }

      doc.end();
      await new Promise((resolve) => doc.on('end', resolve));
      res.end(Buffer.concat(buffers));
    } catch (error) {
      console.error('SMS Patching PDF error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    }
  }
}

module.exports = SmsPatchingController;
