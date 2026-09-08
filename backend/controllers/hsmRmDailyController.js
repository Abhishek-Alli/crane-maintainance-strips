const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query, transaction } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { unlinkUpload, absoluteUploadPath } = require('../middleware/upload');
const {
  CHECK_SECTIONS,
  nullIfEmpty,
  normalizeChecklistItems,
  normalizeSectionValues,
  findMissingActionTaken,
} = require('../utils/hsmRmDailyConfig');

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

function parseBody(req) {
  if (req.body && typeof req.body.payload === 'string') {
    try {
      return JSON.parse(req.body.payload);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function cleanupUploadedFiles(files) {
  (files || []).forEach((f) => {
    try {
      if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (_) { /* ignore */ }
  });
}

async function saveRmDailyImages(client, logId, files, keepImageIds) {
  const keepIds = Array.isArray(keepImageIds)
    ? keepImageIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n))
    : null;

  if (keepIds) {
    const existing = await client.query(
      `SELECT * FROM hsm_rm_daily_images WHERE log_id = $1`,
      [logId]
    );
    for (const row of existing.rows) {
      if (!keepIds.includes(row.id)) {
        await client.query(`DELETE FROM hsm_rm_daily_images WHERE id = $1`, [row.id]);
        unlinkUpload(row.file_path);
      }
    }
  }

  const orderRes = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM hsm_rm_daily_images WHERE log_id = $1`,
    [logId]
  );
  let order = Number(orderRes.rows[0].m) + 1;

  for (const file of files || []) {
    const relative = `hsm-rm-daily/${file.filename}`;
    await client.query(
      `INSERT INTO hsm_rm_daily_images
         (log_id, file_path, original_name, mime_type, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [logId, relative, file.originalname || null, file.mimetype || null, order++]
    );
  }
}

class HsmRmDailyController {
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
         FROM hsm_rm_daily_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM hsm_rm_daily_checklists l
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
      console.error('HSM RM Daily getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch RM Daily checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const [result, imagesRes] = await Promise.all([
        query(
          `SELECT l.*, u.username AS filled_by_name
           FROM hsm_rm_daily_checklists l
           JOIN users u ON l.filled_by = u.id
           WHERE l.id = $1`,
          [id]
        ),
        query(
          `SELECT * FROM hsm_rm_daily_images WHERE log_id = $1 ORDER BY sort_order, id`,
          [id]
        ),
      ]);
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'RM Daily checklist not found' });
      }
      const row = result.rows[0];
      res.json({
        success: true,
        data: {
          ...row,
          can_modify: isWithinEditWindow(row.created_at),
          images: imagesRes.rows.map((img) => ({
            id: img.id,
            original_name: img.original_name,
            url: `/uploads/${img.file_path.replace(/^[/\\]+/, '')}`,
          })),
        },
      });
    } catch (error) {
      console.error('HSM RM Daily getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch RM Daily checklist' });
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
    const uploaded = req.files || [];
    try {
      const b = parseBody(req);
      const err = HsmRmDailyController._validate(b);
      if (err) {
        cleanupUploadedFiles(uploaded);
        return res.status(400).json({ success: false, message: err });
      }

      const items = normalizeChecklistItems(b.checklist_items);
      const missingAction = findMissingActionTaken(items);
      if (missingAction) {
        cleanupUploadedFiles(uploaded);
        return res.status(400).json({
          success: false,
          message: `Action taken is required for "${missingAction}" (marked NOT OK)`,
        });
      }
      const sectionValues = normalizeSectionValues(b.section_values);

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `INSERT INTO hsm_rm_daily_checklists (
             report_date, shift, shift_engineer, checklist_items, section_values, note, filled_by
           ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)
           RETURNING *`,
          [
            b.report_date,
            String(b.shift).toUpperCase(),
            nullIfEmpty(b.shift_engineer),
            JSON.stringify(items),
            JSON.stringify(sectionValues),
            nullIfEmpty(b.note),
            req.user.id,
          ]
        );
        log = result.rows[0];
        await saveRmDailyImages(client, log.id, uploaded, null);
      });

      res.status(201).json({
        success: true,
        message: 'RM Daily checklist saved',
        data: log,
      });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      console.error('HSM RM Daily create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save RM Daily checklist' });
    }
  }

  static async update(req, res) {
    const uploaded = req.files || [];
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM hsm_rm_daily_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        cleanupUploadedFiles(uploaded);
        return res.status(404).json({ success: false, message: 'RM Daily checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        cleanupUploadedFiles(uploaded);
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }

      const b = parseBody(req);
      const err = HsmRmDailyController._validate(b);
      if (err) {
        cleanupUploadedFiles(uploaded);
        return res.status(400).json({ success: false, message: err });
      }

      const items = normalizeChecklistItems(b.checklist_items);
      const missingAction = findMissingActionTaken(items);
      if (missingAction) {
        cleanupUploadedFiles(uploaded);
        return res.status(400).json({
          success: false,
          message: `Action taken is required for "${missingAction}" (marked NOT OK)`,
        });
      }
      const sectionValues = normalizeSectionValues(b.section_values);
      const keepImageIds = Array.isArray(b.keep_image_ids) ? b.keep_image_ids : [];

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `UPDATE hsm_rm_daily_checklists SET
             report_date = $1, shift = $2, shift_engineer = $3,
             checklist_items = $4::jsonb, section_values = $5::jsonb, note = $6,
             updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [
            b.report_date,
            String(b.shift).toUpperCase(),
            nullIfEmpty(b.shift_engineer),
            JSON.stringify(items),
            JSON.stringify(sectionValues),
            nullIfEmpty(b.note),
            id,
          ]
        );
        log = result.rows[0];
        await saveRmDailyImages(client, log.id, uploaded, keepImageIds);
      });

      res.json({
        success: true,
        message: 'RM Daily checklist updated',
        data: log,
      });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      console.error('HSM RM Daily update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update RM Daily checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM hsm_rm_daily_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'RM Daily checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const images = await query(`SELECT file_path FROM hsm_rm_daily_images WHERE log_id = $1`, [id]);
      await query(`DELETE FROM hsm_rm_daily_checklists WHERE id = $1`, [id]);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({ success: true, message: 'RM Daily checklist deleted' });
    } catch (error) {
      console.error('HSM RM Daily delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete RM Daily checklist' });
    }
  }

  static async clearAll(req, res) {
    try {
      const images = await query(`SELECT file_path FROM hsm_rm_daily_images`);
      const result = await query(`DELETE FROM hsm_rm_daily_checklists RETURNING id`);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({
        success: true,
        message: `Deleted ${result.rowCount} RM Daily checklist(s)`,
        deleted: result.rowCount,
      });
    } catch (error) {
      console.error('HSM RM Daily clearAll error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete all RM Daily history' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const [result, imagesRes] = await Promise.all([
        query(
          `SELECT l.*, u.username AS filled_by_name
           FROM hsm_rm_daily_checklists l
           JOIN users u ON l.filled_by = u.id
           WHERE l.id = $1`,
          [id]
        ),
        query(`SELECT * FROM hsm_rm_daily_images WHERE log_id = $1 ORDER BY sort_order, id`, [id]),
      ]);
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'RM Daily checklist not found' });
      }
      const log = result.rows[0];
      const items = log.checklist_items || {};
      const images = imagesRes.rows;

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
        `attachment; filename=hsm_rm_daily_checklist_${id}_${log.report_date || 'report'}.pdf`
      );

      const pageW = doc.page.width - margin * 2;
      let y = 24;

      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, margin, y, { width: 52 });
        } catch (_) { /* ignore */ }
      }
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e1b4b')
        .text('RM Daily Check List', margin + 60, y + 8, { width: pageW - 60 });
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

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81')
        .text('Checklist items', margin, y);
      y += 14;

      CHECK_SECTIONS.forEach((section, sIdx) => {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 30;
        }
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#312e81')
          .text(`${sIdx + 1}. ${section.label}`, margin, y, { width: pageW });
        y = doc.y + 4;

        {
          const row = items[section.key] || {};
          const st = statusLabel(row.status);
          doc.font('Helvetica').fontSize(8).fillColor('#334155')
            .text(`Status: ${st}`, margin + 16, y, { continued: true });
          doc.text(`   Remark: ${row.remark || '—'}`);
          y = doc.y + 4;
          if (row.status === 'NOT_OK') {
            doc.font('Helvetica').fontSize(8).fillColor('#334155')
              .text(`Action Taken: ${row.action_taken || '—'}`, margin + 16, y, { width: pageW - 16 });
            y = doc.y + 2;
          }
          y += 4;
        }
        y += 4;
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

      const validImages = images.filter((img) => {
        const abs = absoluteUploadPath(img.file_path);
        return abs && fs.existsSync(abs);
      });

      if (validImages.length) {
        const landMargin = 22;
        const landW = 842 - landMargin * 2;
        const landH = 595 - landMargin * 2;
        const gap = 12;
        const perPage = 4;
        let pageBaseY = landMargin;

        const startImagesPage = () => {
          doc.addPage({ size: 'A4', layout: 'landscape' });
          doc.y = landMargin;
          doc.font('Helvetica-Bold').fontSize(14).fillColor('#4f46e5')
            .text('Attached Images', landMargin, doc.y, { width: landW, lineBreak: false });
          doc.y += 18;
          doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
            .text(
              `${formatDateOnly(log.report_date)} · Shift ${log.shift || '—'}`,
              landMargin,
              doc.y,
              { width: landW, lineBreak: false }
            );
          doc.y += 14;
          doc.moveTo(landMargin, doc.y).lineTo(landMargin + landW, doc.y).stroke('#4f46e5');
          doc.y += 12;
          doc.fillColor('#000000');
          pageBaseY = doc.y;
        };

        validImages.forEach((img, i) => {
          const slot = i % perPage;
          if (slot === 0) startImagesPage();

          const col = slot % 2;
          const row = Math.floor(slot / 2);
          const imgW = (landW - gap) / 2;
          const imgH = ((landMargin + landH) - pageBaseY - gap) / 2;
          const x = landMargin + col * (imgW + gap);
          const yImg = pageBaseY + row * (imgH + gap);
          const abs = absoluteUploadPath(img.file_path);

          try {
            doc.image(abs, x, yImg, { fit: [imgW, imgH], align: 'center', valign: 'center' });
            doc.rect(x, yImg, imgW, imgH).stroke('#d6d3d1');
          } catch (err) {
            console.error('PDF image embed error:', err.message);
          }
        });
      }

      doc.end();
      await new Promise((resolve) => doc.on('end', resolve));
      res.end(Buffer.concat(buffers));
    } catch (error) {
      console.error('HSM RM Daily PDF error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    }
  }
}

module.exports = HsmRmDailyController;
