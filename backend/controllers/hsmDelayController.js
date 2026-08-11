const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');

const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');

function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '—';
  let s = value;
  if (typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)) {
    s = value.slice(0, 5);
  } else {
    try {
      const d = new Date(`1970-01-01T${value}`);
      if (!Number.isNaN(d.getTime())) {
        s = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        s = String(value).slice(0, 5);
      }
    } catch (_) {
      s = String(value).slice(0, 5);
    }
  }
  const [hhStr, mmStr] = String(s).split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return String(s);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatDuration(mins) {
  if (mins == null || mins === '') return '—';
  const m = parseInt(mins, 10);
  if (Number.isNaN(m)) return String(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  return `${h} hr ${rem} min (${m} min)`;
}

function calcTotalMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const toMins = (t) => {
    const s = String(t).slice(0, 5);
    const [hh, mm] = s.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };
  const a = toMins(startTime);
  const b = toMins(endTime);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // overnight
  return diff;
}

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

class HsmDelayController {
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
      // Date-filtered lists can be large (Excel imports); default higher when filtering
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hsm_delay_reports l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM hsm_delay_reports l
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
      console.error('HSM Delay getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch delay reports' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hsm_delay_reports l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Delay report not found' });
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
      console.error('HSM Delay getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch delay report' });
    }
  }

  static _payloadFields(b) {
    const startTime = nullIfEmpty(b.start_time);
    const endTime = nullIfEmpty(b.end_time);
    const total =
      b.total_minutes != null && b.total_minutes !== ''
        ? parseInt(b.total_minutes, 10)
        : calcTotalMinutes(startTime, endTime);

    return [
      b.report_date,
      String(b.shift).toUpperCase(),
      startTime,
      endTime,
      Number.isNaN(total) ? null : total,
      nullIfEmpty(b.reason),
      nullIfEmpty(b.agency),
      nullIfEmpty(b.hotout_source),
      nullIfEmpty(b.hotout_thickness),
      nullIfEmpty(b.hotout_width),
      nullIfEmpty(b.hotout_length),
      nullIfEmpty(b.hotout_pieces),
      nullIfEmpty(b.hotout_mt),
      nullIfEmpty(b.hotout_remark),
      nullIfEmpty(b.miss_thickness),
      nullIfEmpty(b.miss_width),
      nullIfEmpty(b.miss_length),
      nullIfEmpty(b.miss_pieces),
      nullIfEmpty(b.miss_mt),
      nullIfEmpty(b.miss_location),
      nullIfEmpty(b.miss_operator_name),
      nullIfEmpty(b.miss_remark),
    ];
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
      const err = HsmDelayController._validate(b);
      if (err) return res.status(400).json({ success: false, message: err });

      const fields = HsmDelayController._payloadFields(b);
      const result = await query(
        `INSERT INTO hsm_delay_reports (
           report_date, shift, start_time, end_time, total_minutes, reason, agency,
           hotout_source, hotout_thickness, hotout_width, hotout_length, hotout_pieces, hotout_mt, hotout_remark,
           miss_thickness, miss_width, miss_length, miss_pieces, miss_mt, miss_location, miss_operator_name, miss_remark,
           filled_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,$20,$21,$22,
           $23
         ) RETURNING *`,
        [...fields, req.user.id]
      );

      res.status(201).json({
        success: true,
        message: 'Delay report submitted',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('HSM Delay create error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit delay report' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM hsm_delay_reports WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Delay report not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }

      const b = req.body || {};
      const err = HsmDelayController._validate(b);
      if (err) return res.status(400).json({ success: false, message: err });

      const fields = HsmDelayController._payloadFields(b);
      const result = await query(
        `UPDATE hsm_delay_reports SET
           report_date = $1, shift = $2, start_time = $3, end_time = $4, total_minutes = $5,
           reason = $6, agency = $7,
           hotout_source = $8, hotout_thickness = $9, hotout_width = $10, hotout_length = $11,
           hotout_pieces = $12, hotout_mt = $13, hotout_remark = $14,
           miss_thickness = $15, miss_width = $16, miss_length = $17, miss_pieces = $18,
           miss_mt = $19, miss_location = $20, miss_operator_name = $21, miss_remark = $22,
           updated_at = NOW()
         WHERE id = $23
         RETURNING *`,
        [...fields, id]
      );

      res.json({
        success: true,
        message: 'Delay report updated',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('HSM Delay update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update delay report' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM hsm_delay_reports WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Delay report not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM hsm_delay_reports WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Delay report deleted' });
    } catch (error) {
      console.error('HSM Delay delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete delay report' });
    }
  }

  static async clearAll(req, res) {
    try {
      const result = await query(`DELETE FROM hsm_delay_reports RETURNING id`);
      res.json({
        success: true,
        message: `Deleted ${result.rowCount} delay report(s)`,
        deleted: result.rowCount,
      });
    } catch (error) {
      console.error('HSM Delay clearAll error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete all delay report history' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hsm_delay_reports l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Delay report not found' });
      }
      const log = result.rows[0];

      const margin = 22;
      const pageW = 551;
      const colX = margin;
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 14, bottom: 18, left: margin, right: margin },
        bufferPages: true,
      });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=hsm_delay_report_${id}_${log.report_date || 'report'}.pdf`
      );

      const logoSize = 72;
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, colX, 12, { width: logoSize, height: logoSize });
      }
      const textX = colX + logoSize + 12;
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000')
        .text('SRJ Strips & Pipes', textX, 20, { width: pageW - logoSize - 12, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#4f46e5')
        .text('HSM CHECKSHEET REPORT', textX, 42, { width: pageW - logoSize - 12, lineBreak: false });
      doc.fillColor('#000000').font('Helvetica').fontSize(11)
        .text('Delay Report', textX, 62, { width: pageW - logoSize - 12, lineBreak: false });
      doc.moveTo(colX, 92).lineTo(colX + pageW, 92).stroke('#4f46e5');
      doc.y = 100;

      const PAGE_BOTTOM = 820;
      const ensureSpace = (h = 30) => {
        if (doc.y + h > PAGE_BOTTOM) {
          doc.addPage();
          doc.y = margin;
        }
      };

      const sectionBanner = (title) => {
        ensureSpace(30);
        const y = doc.y;
        doc.rect(colX, y, pageW, 20).fill('#4f46e5');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF')
          .text(title, colX + 8, y + 5, { width: pageW - 16, lineBreak: false });
        doc.fillColor('#000000');
        doc.x = colX;
        doc.y = y + 28;
      };

      const cellText = (value) => (value == null || value === '' ? '—' : String(value));

      const drawKeyValueTable = (rows, opts = {}) => {
        const labelW = opts.labelW || 160;
        const valueW = pageW - labelW;
        const pad = 5;

        rows.forEach((row, idx) => {
          const label = row[0];
          const value = cellText(row[1]);
          doc.font('Helvetica-Bold').fontSize(10);
          const labelH = Math.min(40, doc.heightOfString(label, { width: labelW - pad * 2 }));
          doc.font('Helvetica').fontSize(10);
          const valueH = Math.min(60, doc.heightOfString(value, { width: valueW - pad * 2 }));
          const rowH = Math.max(20, Math.ceil(Math.max(labelH, valueH)) + pad * 2);

          ensureSpace(rowH + 1);
          const y = doc.y;

          if (idx % 2 === 0) doc.rect(colX, y, pageW, rowH).fill('#eef2ff');
          doc.rect(colX, y, pageW, rowH).stroke('#d6d3d1');
          doc.moveTo(colX + labelW, y).lineTo(colX + labelW, y + rowH).stroke('#d6d3d1');

          doc.font('Helvetica-Bold').fontSize(10).fillColor('#44403c');
          doc.text(label, colX + pad, y + pad, {
            width: labelW - pad * 2,
            height: rowH - pad * 2,
            ellipsis: true,
          });
          doc.font('Helvetica').fontSize(10).fillColor('#111827');
          doc.text(value, colX + labelW + pad, y + pad, {
            width: valueW - pad * 2,
            height: rowH - pad * 2,
            ellipsis: true,
          });

          doc.x = colX;
          doc.y = y + rowH;
        });
        doc.y += 6;
      };

      sectionBanner('Basic Details');
      drawKeyValueTable([
        ['Date', formatDateOnly(log.report_date)],
        ['Shift', log.shift],
        ['Start Time', formatTime(log.start_time)],
        ['End Time', formatTime(log.end_time)],
        ['Total Time', formatDuration(log.total_minutes)],
        ['Reason', log.reason],
        ['Agency', log.agency],
        ['Filled By', log.filled_by_name],
      ]);

      sectionBanner('HOTOUT');
      drawKeyValueTable([
        ['Source', log.hotout_source],
        ['Thickness', log.hotout_thickness],
        ['Width', log.hotout_width],
        ['Length', log.hotout_length],
        ['Pieces', log.hotout_pieces],
        ['MT', log.hotout_mt],
        ['Remark', log.hotout_remark],
      ]);

      sectionBanner('Miss Roll');
      drawKeyValueTable([
        ['Thickness', log.miss_thickness],
        ['Width', log.miss_width],
        ['Length', log.miss_length],
        ['Pieces', log.miss_pieces],
        ['MT', log.miss_mt],
        ['Location', log.miss_location],
        ['Operator Name', log.miss_operator_name],
        ['Remark', log.miss_remark],
      ]);

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();
    } catch (error) {
      console.error('HSM Delay PDF error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }

  static async downloadTemplate(req, res) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Delay Reports');
      const headers = [
        'Date',
        'Shift',
        'Start Time',
        'End Time',
        'Reason',
        'Agency',
        'HOTOUT Source',
        'HOTOUT Thickness',
        'HOTOUT Width',
        'HOTOUT Length',
        'HOTOUT Pieces',
        'HOTOUT MT',
        'HOTOUT Remark',
        'Miss Thickness',
        'Miss Width',
        'Miss Length',
        'Miss Pieces',
        'Miss MT',
        'Miss Location',
        'Miss Operator Name',
        'Miss Remark',
      ];
      sheet.addRow(headers);
      sheet.getRow(1).font = { bold: true };
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(14, h.length + 2) }));

      // Sample row
      sheet.addRow([
        (() => {
          const d = new Date();
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${dd}-${mm}-${d.getFullYear()}`;
        })(),
        'A',
        '09:30 AM',
        '11:00 AM',
        'Sample reason',
        'Sample agency',
        '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
      ]);

      const help = workbook.addWorksheet('Instructions');
      help.addRow(['HSM Delay Report — Import Instructions']);
      help.getRow(1).font = { bold: true, size: 14 };
      help.addRow([]);
      help.addRow(['1. Fill data in "Delay Reports" sheet — one row = one report']);
      help.addRow(['2. Date: DD-MM-YYYY (e.g. 11-08-2026)']);
      help.addRow(['3. Shift: A, B, or C only']);
      help.addRow(['4. Start/End Time: hh:mm AM/PM (e.g. 09:30 AM or 02:15 PM)']);
      help.addRow(['5. Total Time is calculated automatically — do not add a column']);
      help.addRow(['6. Delete the sample row before importing']);
      help.getColumn(1).width = 80;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=HSM_Delay_Report_Import_Template.xlsx'
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('HSM Delay template error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate template' });
    }
  }

  static _cellRaw(value) {
    if (value == null) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value.result != null) return HsmDelayController._cellRaw(value.result);
      if (value.text != null) return value.text;
      if (value.richText && Array.isArray(value.richText)) {
        return value.richText.map((t) => t.text || '').join('');
      }
      if (value instanceof Date) return value;
    }
    return value;
  }

  static _formatDateYmd(y, m, d) {
    if (!y || !m || !d) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  static _parseExcelDate(value) {
    const v = HsmDelayController._cellRaw(value);
    if (v == null || v === '') return null;

    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      return HsmDelayController._formatDateYmd(v.getFullYear(), v.getMonth() + 1, v.getDate());
    }

    if (typeof v === 'number' && !Number.isNaN(v)) {
      // Excel serial date (days since 1899-12-30); ignore pure time fractions < 1
      if (v > 0 && v < 1) return null;
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + Math.floor(v) * 86400000);
      if (!Number.isNaN(d.getTime())) {
        return HsmDelayController._formatDateYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      }
    }

    const s = String(v).trim().replace(/\./g, '-').replace(/\//g, '-');
    if (!s) return null;

    // DD-MM-YYYY (preferred)
    let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      return HsmDelayController._formatDateYmd(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10));
    }
    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      return HsmDelayController._formatDateYmd(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    }
    // e.g. 11 Aug 2026 / 11-Aug-2026
    m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
    if (m) {
      const months = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      };
      const mon = months[m[2].slice(0, 3).toLowerCase()];
      if (mon) return HsmDelayController._formatDateYmd(parseInt(m[3], 10), mon, parseInt(m[1], 10));
    }
    return null;
  }

  static _parseExcelTime(value) {
    const v = HsmDelayController._cellRaw(value);
    if (v == null || v === '') return null;
    // Excel time fraction (0–1) OR datetime serial with time part
    if (typeof v === 'number' && !Number.isNaN(v)) {
      let fraction = v;
      if (v >= 1) fraction = v - Math.floor(v);
      if (fraction < 0) return null;
      const totalMins = Math.round(fraction * 24 * 60) % (24 * 60);
      const hh = Math.floor(totalMins / 60);
      const mm = totalMins % 60;
      // If whole number date with no time, treat as empty time
      if (v >= 1 && fraction === 0) return null;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
    }
    const s = String(v).trim();
    // Preferred: hh:mm AM/PM
    const ampm = s.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)\.?$/i);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = parseInt(ampm[2], 10);
      const period = ampm[3].toUpperCase();
      if (Number.isNaN(h) || Number.isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return null;
      if (period === 'AM') {
        if (h === 12) h = 0;
      } else if (h !== 12) {
        h += 12;
      }
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    // Fallback: 24h HH:MM
    const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m24) return null;
    const hh = parseInt(m24[1], 10);
    const mm = parseInt(m24[2], 10);
    if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  static async importExcel(req, res) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Excel file is required' });
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.getWorksheet('Delay Reports') || workbook.worksheets[0];
      if (!sheet) {
        return res.status(400).json({ success: false, message: 'No worksheet found in Excel file' });
      }

      const headerRow = sheet.getRow(1);
      const headers = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
        headers[col] = String(cell.value || '').trim();
      });

      const col = (name) => {
        const idx = headers.findIndex((h) => h && h.toLowerCase() === name.toLowerCase());
        return idx > 0 ? idx : null;
      };

      const map = {
        date: col('Date'),
        shift: col('Shift'),
        start: col('Start Time'),
        end: col('End Time'),
        reason: col('Reason'),
        agency: col('Agency'),
        hotout_source: col('HOTOUT Source'),
        hotout_thickness: col('HOTOUT Thickness'),
        hotout_width: col('HOTOUT Width'),
        hotout_length: col('HOTOUT Length'),
        hotout_pieces: col('HOTOUT Pieces'),
        hotout_mt: col('HOTOUT MT'),
        hotout_remark: col('HOTOUT Remark'),
        miss_thickness: col('Miss Thickness'),
        miss_width: col('Miss Width'),
        miss_length: col('Miss Length'),
        miss_pieces: col('Miss Pieces'),
        miss_mt: col('Miss MT'),
        miss_location: col('Miss Location'),
        miss_operator_name: col('Miss Operator Name'),
        miss_remark: col('Miss Remark'),
      };

      if (!map.date || !map.shift) {
        return res.status(400).json({
          success: false,
          message: 'Excel must include Date and Shift columns (use the download template)',
        });
      }

      const cellVal = (row, c) => {
        if (!c) return null;
        const cell = row.getCell(c);
        const raw = HsmDelayController._cellRaw(cell.value);
        // Prefer parsed value; fall back to Excel display text (helps DD-MM-YYYY text cells)
        if (raw != null && raw !== '') return raw;
        if (cell.text != null && String(cell.text).trim() !== '') return String(cell.text).trim();
        return null;
      };

      const previewVal = (v) => {
        if (v == null || v === '') return '(empty)';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        const s = String(v).trim();
        return s.length > 40 ? `${s.slice(0, 40)}…` : s;
      };

      const errors = [];
      const toInsert = [];

      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const rawDate = cellVal(row, map.date);
        const reportDate = HsmDelayController._parseExcelDate(rawDate);
        const shiftRaw = cellVal(row, map.shift);
        const shift = shiftRaw != null ? String(shiftRaw).trim().toUpperCase() : '';

        // skip fully empty rows
        const anyData = headers.some((_, i) => {
          if (!i) return false;
          const v = cellVal(row, i);
          return v != null && String(v).trim() !== '';
        });
        if (!anyData) return;

        // Trailing / partial rows with no date and no shift — skip (not an error)
        const dateEmpty = rawDate == null || String(rawDate).trim() === '';
        if (dateEmpty && !shift) return;

        if (!reportDate) {
          errors.push(
            dateEmpty
              ? `Row ${rowNumber}: Date is empty (use DD-MM-YYYY, e.g. 11-08-2026)`
              : `Row ${rowNumber}: invalid Date "${previewVal(rawDate)}" — use DD-MM-YYYY (e.g. 11-08-2026)`
          );
          return;
        }
        if (!['A', 'B', 'C'].includes(shift)) {
          errors.push(
            shift
              ? `Row ${rowNumber}: Shift must be A, B, or C (got "${previewVal(shiftRaw)}")`
              : `Row ${rowNumber}: Shift is empty (must be A, B, or C)`
          );
          return;
        }

        const rawStart = cellVal(row, map.start);
        const rawEnd = cellVal(row, map.end);
        const startTime = HsmDelayController._parseExcelTime(rawStart);
        const endTime = HsmDelayController._parseExcelTime(rawEnd);
        if (rawStart != null && String(rawStart).trim() !== '' && !startTime) {
          errors.push(`Row ${rowNumber}: invalid Start Time "${previewVal(rawStart)}" (use hh:mm AM/PM, e.g. 09:30 AM)`);
          return;
        }
        if (rawEnd != null && String(rawEnd).trim() !== '' && !endTime) {
          errors.push(`Row ${rowNumber}: invalid End Time "${previewVal(rawEnd)}" (use hh:mm AM/PM, e.g. 02:15 PM)`);
          return;
        }

        toInsert.push({
          report_date: reportDate,
          shift,
          start_time: startTime,
          end_time: endTime,
          total_minutes: calcTotalMinutes(startTime, endTime),
          reason: nullIfEmpty(cellVal(row, map.reason)),
          agency: nullIfEmpty(cellVal(row, map.agency)),
          hotout_source: nullIfEmpty(cellVal(row, map.hotout_source)),
          hotout_thickness: nullIfEmpty(cellVal(row, map.hotout_thickness)),
          hotout_width: nullIfEmpty(cellVal(row, map.hotout_width)),
          hotout_length: nullIfEmpty(cellVal(row, map.hotout_length)),
          hotout_pieces: nullIfEmpty(cellVal(row, map.hotout_pieces)),
          hotout_mt: nullIfEmpty(cellVal(row, map.hotout_mt)),
          hotout_remark: nullIfEmpty(cellVal(row, map.hotout_remark)),
          miss_thickness: nullIfEmpty(cellVal(row, map.miss_thickness)),
          miss_width: nullIfEmpty(cellVal(row, map.miss_width)),
          miss_length: nullIfEmpty(cellVal(row, map.miss_length)),
          miss_pieces: nullIfEmpty(cellVal(row, map.miss_pieces)),
          miss_mt: nullIfEmpty(cellVal(row, map.miss_mt)),
          miss_location: nullIfEmpty(cellVal(row, map.miss_location)),
          miss_operator_name: nullIfEmpty(cellVal(row, map.miss_operator_name)),
          miss_remark: nullIfEmpty(cellVal(row, map.miss_remark)),
        });
      });

      if (!toInsert.length) {
        return res.status(400).json({
          success: false,
          message: errors.length
            ? `No valid rows to import. ${errors.slice(0, 5).join('; ')}`
            : 'No data rows found in Excel',
          errors,
        });
      }

      let imported = 0;
      for (const row of toInsert) {
        await query(
          `INSERT INTO hsm_delay_reports (
             report_date, shift, start_time, end_time, total_minutes, reason, agency,
             hotout_source, hotout_thickness, hotout_width, hotout_length, hotout_pieces, hotout_mt, hotout_remark,
             miss_thickness, miss_width, miss_length, miss_pieces, miss_mt, miss_location, miss_operator_name, miss_remark,
             filled_by
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,
             $8,$9,$10,$11,$12,$13,$14,
             $15,$16,$17,$18,$19,$20,$21,$22,
             $23
           )`,
          [
            row.report_date, row.shift, row.start_time, row.end_time, row.total_minutes, row.reason, row.agency,
            row.hotout_source, row.hotout_thickness, row.hotout_width, row.hotout_length, row.hotout_pieces, row.hotout_mt, row.hotout_remark,
            row.miss_thickness, row.miss_width, row.miss_length, row.miss_pieces, row.miss_mt, row.miss_location, row.miss_operator_name, row.miss_remark,
            req.user.id,
          ]
        );
        imported += 1;
      }

      res.json({
        success: true,
        message: `Imported ${imported} delay report(s)`,
        data: { imported, skipped_errors: errors.length, errors: errors.slice(0, 20) },
      });
    } catch (error) {
      console.error('HSM Delay import error:', error);
      res.status(500).json({ success: false, message: 'Failed to import Excel file' });
    }
  }
}

module.exports = HsmDelayController;
