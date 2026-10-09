'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query, transaction } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { absoluteUploadPath, unlinkUpload } = require('../middleware/upload');
const { parseMultipartBody, cleanupUploadedFiles } = require('../utils/hsmImageHelpers');
const {
  ELECTRICAL_SECTIONS,
  ALL_POINTS,
  POINT_BY_KEY,
  nullIfEmpty,
  hasValue,
  isAlert,
  needsPhoto,
  countAlerts,
  normalizeChecklistItems,
} = require('../utils/smsElectricalConfig');

const UPLOAD_SUBDIR = 'sms-electrical';
const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');

function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapImageRows(rows) {
  return rows.map((img) => ({
    id: img.id,
    item_key: img.item_key,
    original_name: img.original_name,
    url: `/uploads/${img.file_path.replace(/^[/\\]+/, '')}`,
  }));
}

function photoItemKeys(items) {
  return new Set(ALL_POINTS.filter((p) => needsPhoto(p, items[p.key]?.value)).map((p) => p.key));
}

function pairNewFiles(files, rawKeys, wantedKeys) {
  const keys = Array.isArray(rawKeys) ? rawKeys : [];
  if (keys.length !== files.length) return { error: 'Photo upload mismatch — please re-attach the photos' };
  const keep = [];
  const drop = [];
  files.forEach((file, i) => {
    if (wantedKeys.has(keys[i])) keep.push({ file, itemKey: keys[i] });
    else drop.push(file);
  });
  return { keep, drop };
}

class SmsElectricalController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, limit } = req.query;
      const conditions = [];
      const params = [];
      if (date_from) { params.push(date_from); conditions.push(`l.report_date >= $${params.length}::date`); }
      if (date_to)   { params.push(date_to);   conditions.push(`l.report_date <= $${params.length}::date`); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsed = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 2000) : 200;
      params.push(rowLimit);
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_electrical_checklists l
         JOIN users u ON l.filled_by = u.id
         ${where}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_electrical_checklists l ${where}`,
        params.slice(0, -1)
      );
      res.json({ success: true, data: result.rows, total: countResult.rows[0]?.total ?? result.rows.length });
    } catch (err) {
      console.error('SmsElectrical getLogs:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch electrical checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const [result, imagesRes] = await Promise.all([
        query(
          `SELECT l.*, u.username AS filled_by_name
           FROM sms_electrical_checklists l
           JOIN users u ON l.filled_by = u.id
           WHERE l.id = $1`, [id]
        ),
        query(`SELECT * FROM sms_electrical_images WHERE log_id = $1 ORDER BY sort_order, id`, [id]),
      ]);
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      const row = result.rows[0];
      res.json({
        success: true,
        data: { ...row, can_modify: isWithinEditWindow(row.created_at), images: mapImageRows(imagesRes.rows) },
      });
    } catch (err) {
      console.error('SmsElectrical getById:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch checklist' });
    }
  }

  static async create(req, res) {
    const uploaded = req.files || [];
    try {
      const b = parseMultipartBody(req);
      if (!b.report_date) { cleanupUploadedFiles(uploaded); return res.status(400).json({ success: false, message: 'Date is required' }); }
      if (!b.shift || !['A','B','C'].includes(String(b.shift).toUpperCase())) {
        cleanupUploadedFiles(uploaded);
        return res.status(400).json({ success: false, message: 'Shift must be A, B, or C' });
      }

      const rawItems = typeof b.checklist_items === 'string' ? JSON.parse(b.checklist_items) : (b.checklist_items || {});
      const items = normalizeChecklistItems(rawItems);
      const alerts = countAlerts(items);
      const wantedKeys = photoItemKeys(items);
      const { keep, drop, error } = pairNewFiles(uploaded, b.new_image_item_keys, wantedKeys);
      if (error) { cleanupUploadedFiles(uploaded); return res.status(400).json({ success: false, message: error }); }
      cleanupUploadedFiles(drop);

      let log;
      await transaction(async (client) => {
        const r = await client.query(
          `INSERT INTO sms_electrical_checklists
             (report_date, shift, recorded_by, area, checklist_items, alert_count, general_remark, filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [b.report_date, String(b.shift).toUpperCase(), nullIfEmpty(b.recorded_by), nullIfEmpty(b.area),
           JSON.stringify(items), alerts, nullIfEmpty(b.general_remark), req.user.id]
        );
        log = r.rows[0];
        for (let i = 0; i < keep.length; i++) {
          const { file, itemKey } = keep[i];
          const rel = `${UPLOAD_SUBDIR}/${file.filename}`;
          await client.query(
            `INSERT INTO sms_electrical_images (log_id, item_key, file_path, original_name, mime_type, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [log.id, itemKey, rel, file.originalname, file.mimetype, i]
          );
        }
      });
      res.status(201).json({ success: true, message: 'Electrical checklist submitted', data: log });
    } catch (err) {
      cleanupUploadedFiles(uploaded);
      console.error('SmsElectrical create:', err);
      res.status(500).json({ success: false, message: 'Failed to submit checklist' });
    }
  }

  static async update(req, res) {
    const uploaded = req.files || [];
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM sms_electrical_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) { cleanupUploadedFiles(uploaded); return res.status(404).json({ success: false, message: 'Not found' }); }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        cleanupUploadedFiles(uploaded);
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }

      const b = parseMultipartBody(req);
      const rawItems = typeof b.checklist_items === 'string' ? JSON.parse(b.checklist_items) : (b.checklist_items || {});
      const items = normalizeChecklistItems(rawItems);
      const alerts = countAlerts(items);
      const wantedKeys = photoItemKeys(items);
      const keepIds = Array.isArray(b.keep_image_ids) ? b.keep_image_ids.map(Number) : [];
      const { keep, drop, error } = pairNewFiles(uploaded, b.new_image_item_keys, wantedKeys);
      if (error) { cleanupUploadedFiles(uploaded); return res.status(400).json({ success: false, message: error }); }
      cleanupUploadedFiles(drop);

      let log;
      await transaction(async (client) => {
        const r = await client.query(
          `UPDATE sms_electrical_checklists SET
             report_date=$1, shift=$2, recorded_by=$3, area=$4,
             checklist_items=$5, alert_count=$6, general_remark=$7, updated_at=NOW()
           WHERE id=$8 RETURNING *`,
          [b.report_date, String(b.shift).toUpperCase(), nullIfEmpty(b.recorded_by), nullIfEmpty(b.area),
           JSON.stringify(items), alerts, nullIfEmpty(b.general_remark), id]
        );
        log = r.rows[0];
        const oldImages = await client.query(`SELECT * FROM sms_electrical_images WHERE log_id=$1`, [id]);
        const toDelete = oldImages.rows.filter((img) => !keepIds.includes(img.id));
        for (const img of toDelete) {
          await client.query(`DELETE FROM sms_electrical_images WHERE id=$1`, [img.id]);
          unlinkUpload(img.file_path);
        }
        for (let i = 0; i < keep.length; i++) {
          const { file, itemKey } = keep[i];
          const rel = `${UPLOAD_SUBDIR}/${file.filename}`;
          await client.query(
            `INSERT INTO sms_electrical_images (log_id, item_key, file_path, original_name, mime_type, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [log.id, itemKey, rel, file.originalname, file.mimetype, i]
          );
        }
      });
      res.json({ success: true, message: 'Checklist updated', data: log });
    } catch (err) {
      cleanupUploadedFiles(uploaded);
      console.error('SmsElectrical update:', err);
      res.status(500).json({ success: false, message: 'Failed to update checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM sms_electrical_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      if (!isWithinEditWindow(existing.rows[0].created_at)) return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      const images = await query(`SELECT file_path FROM sms_electrical_images WHERE log_id=$1`, [id]);
      await query(`DELETE FROM sms_electrical_checklists WHERE id=$1`, [id]);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({ success: true, message: 'Deleted' });
    } catch (err) {
      console.error('SmsElectrical remove:', err);
      res.status(500).json({ success: false, message: 'Failed to delete' });
    }
  }

  static async clearAll(req, res) {
    try {
      const images = await query(`SELECT file_path FROM sms_electrical_images`);
      const result = await query(`DELETE FROM sms_electrical_checklists RETURNING id`);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({ success: true, message: `Deleted ${result.rowCount} checklist(s)`, deleted: result.rowCount });
    } catch (err) {
      console.error('SmsElectrical clearAll:', err);
      res.status(500).json({ success: false, message: 'Failed to clear all' });
    }
  }

  static async downloadPDF(req, res) {
    try {
      const { id } = req.params;
      const [result, imagesRes] = await Promise.all([
        query(`SELECT l.*, u.username AS filled_by_name FROM sms_electrical_checklists l JOIN users u ON l.filled_by=u.id WHERE l.id=$1`, [id]),
        query(`SELECT * FROM sms_electrical_images WHERE log_id=$1 ORDER BY sort_order, id`, [id]),
      ]);
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      const log = result.rows[0];
      const items = log.checklist_items || {};

      const margin = 22;
      const pageW = 551;
      const doc = new PDFDocument({ size: 'A4', margins: { top: 14, bottom: 18, left: margin, right: margin }, bufferPages: true });
      const buffers = [];
      doc.on('data', (d) => buffers.push(d));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sms_electrical_${id}_${log.report_date}.pdf`);

      const logoSize = 72;
      if (fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH, margin, 12, { width: logoSize, height: logoSize });
      const textX = margin + logoSize + 12;
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text('SRJ Strips & Pipes', textX, 20, { width: pageW - logoSize - 12, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#4f46e5').text('SMS ELECTRICAL CHECK SHEET', textX, 42, { width: pageW - logoSize - 12, lineBreak: false });
      doc.fillColor('#000').font('Helvetica').fontSize(11).text(`Date: ${formatDateOnly(log.report_date)}  Shift: ${log.shift}  Area: ${log.area || '—'}`, textX, 62, { lineBreak: false });
      doc.moveTo(margin, 92).lineTo(margin + pageW, 92).stroke('#4f46e5');
      doc.y = 100;

      const PAGE_BOTTOM = 820;
      const ensureSpace = (h = 30) => { if (doc.y + h > PAGE_BOTTOM) { doc.addPage(); doc.y = margin; } };

      const sectionBanner = (title) => {
        ensureSpace(30);
        const y = doc.y;
        doc.rect(margin, y, pageW, 20).fill('#4f46e5');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFF').text(title, margin + 8, y + 5, { width: pageW - 16, lineBreak: false });
        doc.fillColor('#000'); doc.x = margin; doc.y = y + 28;
      };

      const drawRow = (label, value, idx) => {
        const labelW = 200; const valueW = pageW - labelW; const pad = 5;
        doc.font('Helvetica-Bold').fontSize(10);
        const lh = Math.min(40, doc.heightOfString(label, { width: labelW - pad * 2 }));
        doc.font('Helvetica').fontSize(10);
        const vh = Math.min(60, doc.heightOfString(String(value || '—'), { width: valueW - pad * 2 }));
        const rowH = Math.max(20, Math.ceil(Math.max(lh, vh)) + pad * 2);
        ensureSpace(rowH + 1);
        const y = doc.y;
        if (idx % 2 === 0) doc.rect(margin, y, pageW, rowH).fill('#eef2ff');
        doc.rect(margin, y, pageW, rowH).stroke('#d6d3d1');
        doc.moveTo(margin + labelW, y).lineTo(margin + labelW, y + rowH).stroke('#d6d3d1');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#44403c').text(label, margin + pad, y + pad, { width: labelW - pad * 2, ellipsis: true });
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(String(value || '—'), margin + labelW + pad, y + pad, { width: valueW - pad * 2, ellipsis: true });
        doc.x = margin; doc.y = y + rowH;
      };

      sectionBanner('Basic Details');
      [['Date', formatDateOnly(log.report_date)], ['Shift', log.shift], ['Area', log.area], ['Recorded By', log.recorded_by], ['Filled By', log.filled_by_name]].forEach(([l, v], i) => drawRow(l, v, i));

      ELECTRICAL_SECTIONS.forEach((sec) => {
        sectionBanner(sec.label);
        sec.points.forEach((p, i) => {
          const v = items[p.key]?.value;
          const r = items[p.key]?.remark;
          drawRow(p.label, v ? (r ? `${v} — ${r}` : v) : '—', i);
        });
      });

      if (log.general_remark) {
        sectionBanner('General Remark');
        drawRow('Remark', log.general_remark, 0);
      }

      const validImages = imagesRes.rows.filter((img) => { const abs = absoluteUploadPath(img.file_path); return abs && fs.existsSync(abs); });
      if (validImages.length) {
        const lm = 22; const lW = 842 - lm * 2; const lH = 595 - lm * 2; const gap = 12; let baseY = lm;
        validImages.forEach((img, i) => {
          if (i % 4 === 0) {
            doc.addPage({ size: 'A4', layout: 'landscape' });
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#4f46e5').text('Attached Images', lm, lm);
            doc.y = lm + 30; baseY = doc.y;
          }
          const col = i % 2; const row = Math.floor((i % 4) / 2);
          const imgW = (lW - gap) / 2; const imgH = (lH - baseY + lm - gap) / 2;
          const x = lm + col * (imgW + gap); const y = baseY + row * (imgH + gap);
          try { doc.image(absoluteUploadPath(img.file_path), x, y, { fit: [imgW, imgH], align: 'center', valign: 'center' }); doc.rect(x, y, imgW, imgH).stroke('#d6d3d1'); } catch (_) {}
        });
      }

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();
    } catch (err) {
      console.error('SmsElectrical PDF:', err);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
}

module.exports = SmsElectricalController;
