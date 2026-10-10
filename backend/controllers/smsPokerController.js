const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query, transaction } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { absoluteUploadPath, unlinkUpload } = require('../middleware/upload');
const { parseMultipartBody, cleanupUploadedFiles } = require('../utils/hsmImageHelpers');
const {
  POKER_DEPARTMENT_NAME,
  POKER_FURNACES,
  POKER_CRUCIBLES,
  POKER_POINTS,
  POINT_BY_KEY,
  pointLabel,
  nullIfEmpty,
  hasValue,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
} = require('../utils/smsPokerConfig');

const UPLOAD_SUBDIR = 'sms-poker';
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

function itemCaption(itemKey, items) {
  const p = POINT_BY_KEY.get(itemKey);
  if (!p) return itemKey;
  const value = items?.[p.key]?.value;
  return `${pointLabel(p)}${hasValue(value) ? ` (${value})` : ''}`;
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
  return new Set(POKER_POINTS.filter((p) => needsPhoto(p, items[p.key]?.value)).map((p) => p.key));
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
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM sms_poker_images WHERE log_id = $1`,
    [logId]
  );
  let order = Number(orderRes.rows[0].m) + 1;
  for (const { file, itemKey } of pairs) {
    await client.query(
      `INSERT INTO sms_poker_images (log_id, item_key, file_path, original_name, mime_type, sort_order)
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

class SmsPokerController {
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
                l.checklist_items->'operating_pressure'->>'value' AS operating_pressure,
                u.username AS filled_by_name
         FROM sms_poker_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_poker_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Poker getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch poker maintenance checklists' });
    }
  }

  static async _fetchLog(id) {
    const [result, imagesRes] = await Promise.all([
      query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_poker_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      ),
      query(`SELECT * FROM sms_poker_images WHERE log_id = $1 ORDER BY sort_order, id`, [id]),
    ]);
    return { log: result.rows[0] || null, images: imagesRes.rows };
  }

  static async getById(req, res) {
    try {
      const { log, images } = await SmsPokerController._fetchLog(req.params.id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Poker maintenance checklist not found' });
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
      console.error('SMS Poker getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch poker maintenance checklist' });
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

    // Furnace and crucible are optional, but a given furnace or crucible must be a known one
    const furnace = nullIfEmpty(b.furnace);
    if (furnace && !POKER_FURNACES.includes(furnace)) return { error: 'Invalid furnace' };
    const crucible = nullIfEmpty(b.crucible);
    if (crucible && !POKER_CRUCIBLES.includes(crucible)) return { error: 'Invalid crucible' };

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

    return {
      header: {
        report_date: b.report_date,
        recorded_by: recordedBy,
        furnace,
        crucible,
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
      const prep = SmsPokerController._prepare(b, uploaded);
      if (prep.error) return fail(400, prep.error);
      const h = prep.header;
      cleanupUploadedFiles(prep.dropFiles);

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `INSERT INTO sms_poker_checklists (
             report_date, recorded_by, furnace, crucible, checklist_items, alert_count, filled_by
           ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
           RETURNING id`,
          [
            h.report_date, h.recorded_by, h.furnace, h.crucible,
            JSON.stringify(prep.items), prep.alertCount, req.user.id,
          ]
        );
        log = result.rows[0];
        await insertImages(client, log.id, prep.keepPairs);
      });

      res.status(201).json({ success: true, message: 'Poker maintenance checklist saved', data: log });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      console.error('SMS Poker create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save poker maintenance checklist' });
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
      const existing = await query(`SELECT id, created_at FROM sms_poker_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) return fail(404, 'Poker maintenance checklist not found');
      if (!isWithinEditWindow(existing.rows[0].created_at)) return fail(403, editWindowDeniedMessage());

      const existingImages = (await query(`SELECT * FROM sms_poker_images WHERE log_id = $1`, [id])).rows;
      const b = parseMultipartBody(req);
      const prep = SmsPokerController._prepare(b, uploaded, existingImages);
      if (prep.error) return fail(400, prep.error);
      const h = prep.header;
      cleanupUploadedFiles(prep.dropFiles);
      const keptIds = new Set(prep.keptRows.map((r) => r.id));
      const removedImages = existingImages.filter((r) => !keptIds.has(r.id));

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `UPDATE sms_poker_checklists SET
             report_date = $1, recorded_by = $2, furnace = $3, crucible = $4,
             checklist_items = $5::jsonb, alert_count = $6, updated_at = NOW()
           WHERE id = $7
           RETURNING id`,
          [
            h.report_date, h.recorded_by, h.furnace, h.crucible,
            JSON.stringify(prep.items), prep.alertCount, id,
          ]
        );
        log = result.rows[0];
        if (removedImages.length) {
          await client.query(`DELETE FROM sms_poker_images WHERE id = ANY($1::int[])`, [removedImages.map((r) => r.id)]);
        }
        await insertImages(client, log.id, prep.keepPairs);
      });
      removedImages.forEach((r) => unlinkUpload(r.file_path));

      res.json({ success: true, message: 'Poker maintenance checklist updated', data: log });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      console.error('SMS Poker update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update poker maintenance checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_poker_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Poker maintenance checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const images = await query(`SELECT file_path FROM sms_poker_images WHERE log_id = $1`, [id]);
      await query(`DELETE FROM sms_poker_checklists WHERE id = $1`, [id]);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({ success: true, message: 'Poker maintenance checklist deleted' });
    } catch (error) {
      console.error('SMS Poker delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete poker maintenance checklist' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const { log, images } = await SmsPokerController._fetchLog(id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Poker maintenance checklist not found' });
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
        `attachment; filename=sms_poker_maintenance_${id}_${log.report_date || 'report'}.pdf`
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
        .text('Hyd Poker Maintenance', margin + 60, y + 8, { width: pageW - 60 });
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(`SMS Checksheets · ${POKER_DEPARTMENT_NAME}`, margin + 60, y + 28, { width: pageW - 60 });
      y = 70;

      const meta = [
        ['Date', formatDateOnly(log.report_date)],
        ['Recorded By', log.recorded_by || '—'],
        ['Furnace', log.furnace || '—'],
        ['Crucible', log.crucible || '—'],
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
        { label: 'Status', w: 95 },
        { label: 'Remark', w: pageW - 22 - 190 - 95 },
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
      POKER_POINTS.forEach((p, pIdx) => {
        const row = items[p.key] || {};
        const alert = isAlert(p, row.value);
        const filled = hasValue(row.value);
        const cells = [String(pIdx + 1), pointLabel(p), filled ? String(row.value) : '—', row.remark || '—'];
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

      drawPhotoPages(doc, images, items, `${formatDateOnly(log.report_date)} · Hyd Poker Maintenance`);

      doc.end();
      await new Promise((resolve) => doc.on('end', resolve));
      res.end(Buffer.concat(buffers));
    } catch (error) {
      console.error('SMS Poker PDF error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    }
  }
}

module.exports = SmsPokerController;
