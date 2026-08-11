const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');

const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');

function computeDowntimeMinutes(breakdownAt, restorationAt) {
  if (!breakdownAt || !restorationAt) return null;
  const start = new Date(breakdownAt);
  const end = new Date(restorationAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.round((end - start) / 60000);
}

function formatDt(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDowntime(mins) {
  if (mins == null || mins === '') return '—';
  const m = parseInt(mins, 10);
  if (Number.isNaN(m)) return String(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  return `${h} hr ${rem} min (${m} min)`;
}

class SmsController {
  static async getBreakdownAnalysisLogs(req, res) {
    try {
      const { date_from, date_to, limit } = req.query;
      const conditions = [];
      const params = [];

      if (date_from) {
        params.push(date_from);
        conditions.push(`l.report_date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        conditions.push(`l.report_date <= $${params.length}`);
      }

      params.push(parseInt(limit, 10) || 50);
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_breakdown_analysis_logs l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('SMS getBreakdownAnalysisLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch breakdown analysis reports' });
    }
  }

  static async getBreakdownAnalysisById(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_breakdown_analysis_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Breakdown analysis report not found' });
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
      console.error('SMS getBreakdownAnalysisById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch breakdown analysis report' });
    }
  }

  static async createBreakdownAnalysis(req, res) {
    try {
      const b = req.body || {};
      if (!b.report_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }
      if (!b.machine_name || !String(b.machine_name).trim()) {
        return res.status(400).json({ success: false, message: 'Machine / Equipment Name is required' });
      }

      const downtime =
        b.total_downtime_minutes != null && b.total_downtime_minutes !== ''
          ? parseInt(b.total_downtime_minutes, 10)
          : computeDowntimeMinutes(b.breakdown_at, b.restoration_at);

      const result = await query(
        `INSERT INTO sms_breakdown_analysis_logs (
          report_date, department, machine_name,
          breakdown_at, restoration_at, total_downtime_minutes,
          breakdown_type, observed_problem,
          immediate_cause, root_cause,
          why1_problem, why1_due_to,
          why2_problem, why2_due_to,
          why3_problem, why3_due_to,
          why4_problem, why4_due_to,
          why5_problem, why5_due_to,
          action_taken_to_restore, time_taken_for_repair,
          preventive_steps, spare_parts_used,
          prepared_by, verified_by, filled_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27
        ) RETURNING *`,
        [
          b.report_date,
          b.department || null,
          String(b.machine_name).trim(),
          b.breakdown_at || null,
          b.restoration_at || null,
          Number.isNaN(downtime) ? null : downtime,
          b.breakdown_type || null,
          b.observed_problem || null,
          b.immediate_cause || null,
          b.root_cause || null,
          b.why1_problem || null,
          b.why1_due_to || null,
          b.why2_problem || null,
          b.why2_due_to || null,
          b.why3_problem || null,
          b.why3_due_to || null,
          b.why4_problem || null,
          b.why4_due_to || null,
          b.why5_problem || null,
          b.why5_due_to || null,
          b.action_taken_to_restore || null,
          b.time_taken_for_repair || null,
          b.preventive_steps || null,
          b.spare_parts_used || null,
          b.prepared_by || null,
          b.verified_by || null,
          req.user.id,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Breakdown Analysis Report submitted',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('SMS createBreakdownAnalysis error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit breakdown analysis report' });
    }
  }

  static async updateBreakdownAnalysis(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(
        'SELECT * FROM sms_breakdown_analysis_logs WHERE id = $1',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }

      const b = req.body || {};
      if (!b.report_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }
      if (!b.machine_name || !String(b.machine_name).trim()) {
        return res.status(400).json({ success: false, message: 'Machine / Equipment Name is required' });
      }

      const downtime =
        b.total_downtime_minutes != null && b.total_downtime_minutes !== ''
          ? parseInt(b.total_downtime_minutes, 10)
          : computeDowntimeMinutes(b.breakdown_at, b.restoration_at);

      const result = await query(
        `UPDATE sms_breakdown_analysis_logs SET
          report_date = $1, department = $2, machine_name = $3,
          breakdown_at = $4, restoration_at = $5, total_downtime_minutes = $6,
          breakdown_type = $7, observed_problem = $8,
          immediate_cause = $9, root_cause = $10,
          why1_problem = $11, why1_due_to = $12,
          why2_problem = $13, why2_due_to = $14,
          why3_problem = $15, why3_due_to = $16,
          why4_problem = $17, why4_due_to = $18,
          why5_problem = $19, why5_due_to = $20,
          action_taken_to_restore = $21, time_taken_for_repair = $22,
          preventive_steps = $23, spare_parts_used = $24,
          prepared_by = $25, verified_by = $26,
          updated_at = NOW()
         WHERE id = $27
         RETURNING *`,
        [
          b.report_date,
          b.department || null,
          String(b.machine_name).trim(),
          b.breakdown_at || null,
          b.restoration_at || null,
          Number.isNaN(downtime) ? null : downtime,
          b.breakdown_type || null,
          b.observed_problem || null,
          b.immediate_cause || null,
          b.root_cause || null,
          b.why1_problem || null,
          b.why1_due_to || null,
          b.why2_problem || null,
          b.why2_due_to || null,
          b.why3_problem || null,
          b.why3_due_to || null,
          b.why4_problem || null,
          b.why4_due_to || null,
          b.why5_problem || null,
          b.why5_due_to || null,
          b.action_taken_to_restore || null,
          b.time_taken_for_repair || null,
          b.preventive_steps || null,
          b.spare_parts_used || null,
          b.prepared_by || null,
          b.verified_by || null,
          id,
        ]
      );

      res.json({
        success: true,
        message: 'Breakdown Analysis Report updated',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('SMS updateBreakdownAnalysis error:', error);
      res.status(500).json({ success: false, message: 'Failed to update breakdown analysis report' });
    }
  }

  static async deleteBreakdownAnalysis(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(
        'SELECT id, created_at FROM sms_breakdown_analysis_logs WHERE id = $1',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const result = await query(
        'DELETE FROM sms_breakdown_analysis_logs WHERE id = $1 RETURNING id',
        [id]
      );
      res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
      console.error('SMS deleteBreakdownAnalysis error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete report' });
    }
  }

  static async downloadBreakdownAnalysisPDF(req, res) {
    const { id } = req.params;
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_breakdown_analysis_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Breakdown analysis report not found' });
      }
      const log = result.rows[0];

      const margin = 22;
      const pageW = 551; // A4 width 595 - 22*2
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
        `attachment; filename=sms_breakdown_analysis_${id}_${log.report_date || 'report'}.pdf`
      );

      // Compact header — logo flush to top, no extra top gap
      const logoSize = 72;
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, colX, 12, { width: logoSize, height: logoSize });
      }
      const textX = colX + logoSize + 12;
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
        .text('SRJ Strips & Pipes', textX, 22, { width: pageW - logoSize - 12, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#b45309')
        .text('SMS CHECKSHEET REPORT', textX, 42, { width: pageW - logoSize - 12, lineBreak: false });
      doc.fillColor('#000000').font('Helvetica').fontSize(9)
        .text('Breakdown Analysis Report', textX, 60, { width: pageW - logoSize - 12, lineBreak: false });
      doc.moveTo(colX, 90).lineTo(colX + pageW, 90).stroke('#b45309');
      doc.y = 96;

      const PAGE_BOTTOM = 820;

      const ensureSpace = (h = 30) => {
        if (doc.y + h > PAGE_BOTTOM) {
          doc.addPage();
          doc.y = margin;
        }
      };

      const sectionBanner = (title) => {
        ensureSpace(24);
        const y = doc.y;
        doc.rect(colX, y, pageW, 16).fill('#b45309');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
          .text(title, colX + 6, y + 4, { width: pageW - 12, lineBreak: false });
        doc.fillColor('#000000');
        doc.x = colX;
        doc.y = y + 24; // space below heading before table
      };

      const cellText = (value) => (value == null || value === '' ? '—' : String(value));

      /** Two-column label | value table — compact rows */
      const drawKeyValueTable = (rows, opts = {}) => {
        const labelW = opts.labelW || 175;
        const valueW = pageW - labelW;
        const pad = 3;

        rows.forEach((row, idx) => {
          const label = row[0];
          const value = cellText(row[1]);
          doc.font('Helvetica-Bold').fontSize(7);
          const labelH = Math.min(28, doc.heightOfString(label, { width: labelW - pad * 2 }));
          doc.font('Helvetica').fontSize(7);
          const valueH = Math.min(36, doc.heightOfString(value, { width: valueW - pad * 2 }));
          const rowH = Math.max(15, Math.ceil(Math.max(labelH, valueH)) + pad * 2);

          ensureSpace(rowH + 1);
          const y = doc.y;

          if (idx % 2 === 0) doc.rect(colX, y, pageW, rowH).fill('#fffbeb');
          doc.rect(colX, y, pageW, rowH).stroke('#d6d3d1');
          doc.moveTo(colX + labelW, y).lineTo(colX + labelW, y + rowH).stroke('#d6d3d1');

          doc.font('Helvetica-Bold').fontSize(7).fillColor('#44403c');
          doc.text(label, colX + pad, y + pad, {
            width: labelW - pad * 2,
            height: rowH - pad * 2,
            ellipsis: true,
          });
          doc.font('Helvetica').fontSize(7).fillColor('#111827');
          doc.text(value, colX + labelW + pad, y + pad, {
            width: valueW - pad * 2,
            height: rowH - pad * 2,
            ellipsis: true,
          });

          doc.x = colX;
          doc.y = y + rowH;
        });
        doc.y += 4;
      };

      /** Multi-column table with header (5 Why) — compact */
      const drawDataTable = (headers, rows, colWidths) => {
        const pad = 3;
        const drawRow = (cells, isHeader) => {
          doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 7 : 6.5);
          const heights = cells.map((c, i) =>
            Math.min(22, doc.heightOfString(cellText(c), { width: colWidths[i] - pad * 2 }))
          );
          const rowH = Math.max(isHeader ? 15 : 14, Math.ceil(Math.max(...heights, 8)) + pad * 2);
          ensureSpace(rowH + 1);
          const y = doc.y;

          if (isHeader) doc.rect(colX, y, pageW, rowH).fill('#92400e');
          else doc.rect(colX, y, pageW, rowH).stroke('#d6d3d1');

          let x = colX;
          colWidths.forEach((w, i) => {
            doc.moveTo(x, y).lineTo(x, y + rowH).stroke(isHeader ? '#92400e' : '#d6d3d1');
            doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(isHeader ? 7 : 6.5)
              .fillColor(isHeader ? '#FFFFFF' : '#111827')
              .text(cellText(cells[i]), x + pad, y + pad, {
                width: w - pad * 2,
                height: rowH - pad * 2,
                align: i === 0 && !isHeader ? 'center' : 'left',
                ellipsis: true,
              });
            x += w;
          });

          doc.fillColor('#000000');
          doc.x = colX;
          doc.y = y + rowH;
        };

        drawRow(headers, true);
        rows.forEach((r) => drawRow(r, false));
        doc.y += 4;
      };

      // Basic Details — tabular
      sectionBanner('Basic Details');
      drawKeyValueTable([
        ['Date', formatDateOnly(log.report_date)],
        ['Department', log.department],
        ['Machine / Equipment Name', log.machine_name],
        ['Date & Time of Breakdown', formatDt(log.breakdown_at)],
        ['Date & Time of Restoration', formatDt(log.restoration_at)],
        ['Total Downtime', formatDowntime(log.total_downtime_minutes)],
      ]);

      // Breakdown Description
      sectionBanner('Breakdown Description');
      drawKeyValueTable([
        ['Type of Breakdown', log.breakdown_type],
        ['Observed Problem', log.observed_problem],
      ]);

      // RCA
      sectionBanner('Root Cause Analysis (RCA)');
      drawKeyValueTable([
        ['Immediate Cause (What Happened?)', log.immediate_cause],
        ['Root Cause (Why It Happened?)', log.root_cause],
      ]);

      // 5 Why — tabular
      sectionBanner('Method Used (5 WHY Analysis)');
      drawDataTable(
        ['WHY', 'WHY Problem Occurs', 'Due To'],
        [
          ['WHY - 1', log.why1_problem, log.why1_due_to],
          ['WHY - 2', log.why2_problem, log.why2_due_to],
          ['WHY - 3', log.why3_problem, log.why3_due_to],
          ['WHY - 4', log.why4_problem, log.why4_due_to],
          ['WHY - 5', log.why5_problem, log.why5_due_to],
        ],
        [55, 248, 248]
      );

      // CA
      sectionBanner('Corrective Actions (CA)');
      drawKeyValueTable([
        ['Action Taken to Restore', log.action_taken_to_restore],
        ['Time Taken for Repair', log.time_taken_for_repair],
      ]);

      // PA
      sectionBanner('Preventive Action (PA)');
      drawKeyValueTable([
        ['Steps to Avoid Recurrence', log.preventive_steps],
      ]);

      // Store Material
      sectionBanner('Store Material');
      drawKeyValueTable([
        ['Spare Parts Replaced (If any)', log.spare_parts_used],
      ]);

      // Sign-off — compact document style
      ensureSpace(55);
      doc.y += 8;
      doc.moveTo(colX, doc.y).lineTo(colX + pageW, doc.y).stroke('#d6d3d1');
      doc.y += 10;

      const signY = doc.y;
      const halfW = pageW / 2 - 8;
      const preparedName = cellText(log.prepared_by || log.filled_by_name);
      const verifiedName = cellText(log.verified_by);

      doc.font('Helvetica').fontSize(7).fillColor('#6b7280')
        .text('Prepared by (Maintenance Engineer)', colX, signY, { width: halfW, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827')
        .text(preparedName, colX, signY + 14, { width: halfW, lineBreak: false });
      doc.moveTo(colX, signY + 30).lineTo(colX + Math.min(160, halfW), signY + 30).stroke('#9ca3af');
      doc.font('Helvetica').fontSize(6).fillColor('#9ca3af')
        .text('Signature / Name', colX, signY + 33, { width: halfW, lineBreak: false });

      const rightX = colX + pageW / 2 + 8;
      doc.font('Helvetica').fontSize(7).fillColor('#6b7280')
        .text('Verified by (Dept Head / Manager)', rightX, signY, { width: halfW, align: 'right', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827')
        .text(verifiedName, rightX, signY + 14, { width: halfW, align: 'right', lineBreak: false });
      doc.moveTo(rightX + halfW - Math.min(160, halfW), signY + 30)
        .lineTo(rightX + halfW, signY + 30).stroke('#9ca3af');
      doc.font('Helvetica').fontSize(6).fillColor('#9ca3af')
        .text('Signature / Name', rightX, signY + 33, { width: halfW, align: 'right', lineBreak: false });

      doc.x = colX;
      doc.y = signY + 48;
      doc.fillColor('#000000');

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();
    } catch (error) {
      console.error('SMS Breakdown Analysis PDF error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
}

module.exports = SmsController;
