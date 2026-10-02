const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query, transaction } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { absoluteUploadPath, unlinkUpload } = require('../middleware/upload');
const { parseMultipartBody, cleanupUploadedFiles } = require('../utils/hsmImageHelpers');
const {
  CRUCIBLE_DEPARTMENT_NAME,
  CRUCIBLE_FURNACES,
  CRUCIBLE_NUMBERS,
  CRUCIBLE_POINTS,
  POINT_BY_KEY,
  nullIfEmpty,
  normalizeDateTime,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
} = require('../utils/smsCrucibleConfig');

const UPLOAD_SUBDIR = 'sms-crucible';
const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// TIMESTAMP columns are sent as local 'YYYY-MM-DDTHH:MM' text so no timezone shift happens
const LOG_COLUMNS = `
  l.id, l.report_date, l.recorded_by, l.furnace, l.crucible, l.checklist_items, l.alert_count,
  to_char(l.maintenance_start_at, 'YYYY-MM-DD"T"HH24:MI') AS maintenance_start_at,
  to_char(l.maintenance_stop_at, 'YYYY-MM-DD"T"HH24:MI') AS maintenance_stop_at,
  l.filled_by, l.created_at, l.updated_at, u.username AS filled_by_name`;

function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** 'YYYY-MM-DDTHH:MM' → '28 Sep 2026 14:30' */
function formatDateTime(value) {
  if (!value) return '—';
  const [d, t] = String(value).split('T');
  return `${formatDateOnly(d)} ${t || ''}`.trim();
}

function durationLabel(start, stop) {
  const mins = Math.round((new Date(stop) - new Date(start)) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function itemCaption(itemKey, items) {
  const p = POINT_BY_KEY.get(itemKey);
  if (!p) return itemKey;
  const value = items?.[p.key]?.value;
  return `${p.label}${value ? ` (${value})` : ''}`;
}

function mapImageRows(rows) {
  return rows.map((img) => ({
    id: img.id,
    item_key: img.item_key,
    original_name: img.original_name,
    url: `/uploads/${img.file_path.replace(/^[/\\]+/, '')}`,
  }));
}

/** Point keys whose current value needs a photo */
function photoItemKeys(items) {
  return new Set(CRUCIBLE_POINTS.filter((p) => needsPhoto(p, items[p.key]?.value)).map((p) => p.key));
}

/**
 * Pairs uploaded files with the point they belong to (payload.new_image_item_keys, same order).
 * Files for points that no longer need a photo are dropped.
 */
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

function countPhotos(existingRows, newPairs) {
  const counts = {};
  existingRows.forEach((r) => { counts[r.item_key] = (counts[r.item_key] || 0) + 1; });
  newPairs.forEach((p) => { counts[p.itemKey] = (counts[p.itemKey] || 0) + 1; });
  return counts;
}

async function insertImages(client, logId, pairs) {
  const orderRes = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM sms_crucible_images WHERE log_id = $1`,
    [logId]
  );
  let order = Number(orderRes.rows[0].m) + 1;
  for (const { file, itemKey } of pairs) {
    await client.query(
      `INSERT INTO sms_crucible_images (log_id, item_key, file_path, original_name, mime_type, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [logId, itemKey, `${UPLOAD_SUBDIR}/${file.filename}`, file.originalname || null, file.mimetype || null, order++]
    );
  }
}

function drawPhotoPages(doc, images, items, subtitle) {
  const valid = images.filter((img) => {
    const abs = absoluteUploadPath(img.file_path);
    return abs && fs.existsSync(abs);
  });
  if (!valid.length) return;

  const m = 22;
  const landW = 842 - m * 2;
  const landBottom = 595 - m;
  const gap = 12;
  const captionH = 14;
  let baseY = m;

  valid.forEach((img, i) => {
    const slot = i % 4;
    if (slot === 0) {
      doc.addPage({ size: 'A4', layout: 'landscape' });
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#b45309')
        .text('Attached Photos', m, m, { width: landW, lineBreak: false });
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
        .text(subtitle, m, m + 18, { width: landW, lineBreak: false });
      doc.moveTo(m, m + 34).lineTo(m + landW, m + 34).stroke('#b45309');
      baseY = m + 44;
    }
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    const cellW = (landW - gap) / 2;
    const cellH = (landBottom - baseY - gap) / 2;
    const x = m + col * (cellW + gap);
    const y = baseY + row * (cellH + gap);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f2937')
      .text(itemCaption(img.item_key, items), x, y, { width: cellW, lineBreak: false, ellipsis: true });
    try {
      doc.image(absoluteUploadPath(img.file_path), x, y + captionH, {
        fit: [cellW, cellH - captionH], align: 'center', valign: 'center',
      });
      doc.rect(x, y + captionH, cellW, cellH - captionH).stroke('#d6d3d1');
    } catch (err) {
      console.error('PDF image embed error:', err.message);
    }
  });
}

class SmsCrucibleController {
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
        `SELECT ${LOG_COLUMNS}
         FROM sms_crucible_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_crucible_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows.map(({ checklist_items: _items, ...row }) => row),
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Crucible getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch crucible maintenance checklists' });
    }
  }

  static async _fetchLog(id) {
    const [result, imagesRes] = await Promise.all([
      query(
        `SELECT ${LOG_COLUMNS}
         FROM sms_crucible_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      ),
      query(`SELECT * FROM sms_crucible_images WHERE log_id = $1 ORDER BY sort_order, id`, [id]),
    ]);
    return { log: result.rows[0] || null, images: imagesRes.rows };
  }

  static async getById(req, res) {
    try {
      const { log, images } = await SmsCrucibleController._fetchLog(req.params.id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Crucible maintenance checklist not found' });
      }
      res.json({
        success: true,
        data: {
          ...log,
          can_modify: isWithinEditWindow(log.created_at),
          images: mapImageRows(images),
        },
      });
    } catch (error) {
      console.error('SMS Crucible getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch crucible maintenance checklist' });
    }
  }

  /**
   * Validates the body and the photos. Returns { error } or
   * { header, items, alertCount, keepPairs, dropFiles, keptRows }.
   */
  static _prepare(b, files, existingImages = []) {
    if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
    const recordedBy = nullIfEmpty(b.recorded_by);
    if (!recordedBy) return { error: 'Recorded By is required' };
    if (!CRUCIBLE_FURNACES.includes(b.furnace)) return { error: 'Furnace is required' };
    if (!CRUCIBLE_NUMBERS.includes(String(b.crucible || ''))) return { error: 'Crucible is required' };

    const items = normalizeChecklistItems(b.checklist_items);
    const wanted = photoItemKeys(items);
    const paired = pairNewFiles(files, b.new_image_item_keys, wanted);
    if (paired.error) return { error: paired.error };

    const keepIds = (Array.isArray(b.keep_image_ids) ? b.keep_image_ids : [])
      .map((x) => parseInt(x, 10))
      .filter((n) => !Number.isNaN(n));
    const keptRows = existingImages.filter((r) => keepIds.includes(r.id) && wanted.has(r.item_key));

    const error = findChecklistError(items, countPhotos(keptRows, paired.keep));
    if (error) return { error };

    const start = normalizeDateTime(b.maintenance_start_at);
    const stop = normalizeDateTime(b.maintenance_stop_at);
    if (!start) return { error: 'Maintenance Start Time is required' };
    if (!stop) return { error: 'Maintenance Stop Time is required' };
    // Same fixed-width format, so string order is time order
    if (stop <= start) return { error: 'Maintenance Stop Time must be after Start Time' };

    return {
      header: {
        report_date: b.report_date,
        recorded_by: recordedBy,
        furnace: b.furnace,
        crucible: String(b.crucible),
        maintenance_start_at: start,
        maintenance_stop_at: stop,
      },
      items,
      alertCount: countAlerts(items),
      keepPairs: paired.keep,
      dropFiles: paired.drop,
      keptRows,
    };
  }

  static async create(req, res) {
    const uploaded = req.files || [];
    const fail = (status, message) => {
      cleanupUploadedFiles(uploaded);
      return res.status(status).json({ success: false, message });
    };
    try {
      const b = parseMultipartBody(req);
      const prep = SmsCrucibleController._prepare(b, uploaded);
      if (prep.error) return fail(400, prep.error);
      const h = prep.header;
      cleanupUploadedFiles(prep.dropFiles);

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `INSERT INTO sms_crucible_checklists (
             report_date, recorded_by, furnace, crucible, checklist_items, alert_count,
             maintenance_start_at, maintenance_stop_at, filled_by
           ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
           RETURNING id`,
          [
            h.report_date, h.recorded_by, h.furnace, h.crucible, JSON.stringify(prep.items), prep.alertCount,
            h.maintenance_start_at, h.maintenance_stop_at, req.user.id,
          ]
        );
        log = result.rows[0];
        await insertImages(client, log.id, prep.keepPairs);
      });

      res.status(201).json({ success: true, message: 'Crucible maintenance checklist saved', data: log });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      console.error('SMS Crucible create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save crucible maintenance checklist' });
    }
  }

  static async update(req, res) {
    const uploaded = req.files || [];
    const fail = (status, message) => {
      cleanupUploadedFiles(uploaded);
      return res.status(status).json({ success: false, message });
    };
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_crucible_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) return fail(404, 'Crucible maintenance checklist not found');
      if (!isWithinEditWindow(existing.rows[0].created_at)) return fail(403, editWindowDeniedMessage());

      const existingImages = (await query(`SELECT * FROM sms_crucible_images WHERE log_id = $1`, [id])).rows;
      const b = parseMultipartBody(req);
      const prep = SmsCrucibleController._prepare(b, uploaded, existingImages);
      if (prep.error) return fail(400, prep.error);
      const h = prep.header;
      cleanupUploadedFiles(prep.dropFiles);
      const keptIds = new Set(prep.keptRows.map((r) => r.id));
      const removedImages = existingImages.filter((r) => !keptIds.has(r.id));

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `UPDATE sms_crucible_checklists SET
             report_date = $1, recorded_by = $2, furnace = $3, crucible = $4, checklist_items = $5::jsonb,
             alert_count = $6, maintenance_start_at = $7, maintenance_stop_at = $8, updated_at = NOW()
           WHERE id = $9
           RETURNING id`,
          [
            h.report_date, h.recorded_by, h.furnace, h.crucible, JSON.stringify(prep.items), prep.alertCount,
            h.maintenance_start_at, h.maintenance_stop_at, id,
          ]
        );
        log = result.rows[0];
        if (removedImages.length) {
          await client.query(`DELETE FROM sms_crucible_images WHERE id = ANY($1::int[])`, [removedImages.map((r) => r.id)]);
        }
        await insertImages(client, log.id, prep.keepPairs);
      });
      removedImages.forEach((r) => unlinkUpload(r.file_path));

      res.json({ success: true, message: 'Crucible maintenance checklist updated', data: log });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      console.error('SMS Crucible update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update crucible maintenance checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_crucible_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Crucible maintenance checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const images = await query(`SELECT file_path FROM sms_crucible_images WHERE log_id = $1`, [id]);
      await query(`DELETE FROM sms_crucible_checklists WHERE id = $1`, [id]);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({ success: true, message: 'Crucible maintenance checklist deleted' });
    } catch (error) {
      console.error('SMS Crucible delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete crucible maintenance checklist' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const { log, images } = await SmsCrucibleController._fetchLog(id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Crucible maintenance checklist not found' });
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
        `attachment; filename=sms_crucible_maintenance_${id}_${log.report_date || 'report'}.pdf`
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
        .text('Crucible Maintenance Check Sheet', margin + 60, y + 8, { width: pageW - 60 });
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(`SMS Checksheets · ${CRUCIBLE_DEPARTMENT_NAME}`, margin + 60, y + 28, { width: pageW - 60 });
      y = 70;

      const meta = [
        ['Date', formatDateOnly(log.report_date)],
        ['Furnace', log.furnace || '—'],
        ['Crucible', log.crucible || '—'],
        ['Recorded By', log.recorded_by || '—'],
        ['Maintenance Start', formatDateTime(log.maintenance_start_at)],
        ['Maintenance Stop', formatDateTime(log.maintenance_stop_at)],
        ['Duration', durationLabel(log.maintenance_start_at, log.maintenance_stop_at)],
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
      CRUCIBLE_POINTS.forEach((p, pIdx) => {
        const row = items[p.key] || {};
        const alert = isAlert(p, row.value);
        const cells = [String(pIdx + 1), p.label, row.value || '—', row.remark || '—'];
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
            .fillColor(isStatus ? (alert ? '#b91c1c' : row.value ? '#047857' : '#6b7280') : '#0f172a')
            .text(t, x + pad, y + pad, { width: cols[i].w - pad * 2 });
          x += cols[i].w;
        });
        y += h;
        doc.moveTo(margin, y).lineTo(margin + pageW, y).lineWidth(0.5).stroke('#e5e7eb');
      });

      drawPhotoPages(
        doc,
        images,
        items,
        `${formatDateOnly(log.report_date)} · Furnace ${log.furnace || '—'} · Crucible ${log.crucible || '—'}`
      );

      doc.end();
      await new Promise((resolve) => doc.on('end', resolve));
      res.end(Buffer.concat(buffers));
    } catch (error) {
      console.error('SMS Crucible PDF error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    }
  }
}

module.exports = SmsCrucibleController;
