const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query, transaction } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { absoluteUploadPath, unlinkUpload } = require('../middleware/upload');
const { parseMultipartBody, cleanupUploadedFiles } = require('../utils/hsmImageHelpers');
const {
  EOT_DEPARTMENT_NAME,
  EOT_SECTIONS,
  findCrane,
  EOT_ITEMS,
  ITEM_BY_KEY,
  nullIfEmpty,
  normalizeTime,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
} = require('../utils/smsEotCraneConfig');

const UPLOAD_SUBDIR = 'sms-eot-crane';
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

function craneLabel(number, capacity) {
  return `Crane ${number || '—'}${capacity ? ` (${capacity})` : ''}`;
}

function itemCaption(itemKey, items) {
  const it = ITEM_BY_KEY.get(itemKey);
  if (!it) return itemKey;
  const value = items?.[it.section.key]?.[it.point.key]?.value;
  return `${it.section.short} ${it.point.label}${value ? ` (${value})` : ''}`;
}

function duplicateDayMessage(shedName, craneNumber, reportDate) {
  return `Checklist for ${shedName} Crane ${craneNumber} is already filled for ${formatDateOnly(reportDate)} (only once per day)`;
}

function mapImageRows(rows) {
  return rows.map((img) => ({
    id: img.id,
    item_key: img.item_key,
    original_name: img.original_name,
    url: `/uploads/${img.file_path.replace(/^[/\\]+/, '')}`,
  }));
}

/** Item keys whose current value needs a photo */
function photoItemKeys(items) {
  return new Set(
    EOT_ITEMS
      .filter(({ section, point }) => needsPhoto(point, items[section.key]?.[point.key]?.value))
      .map(({ itemKey }) => itemKey)
  );
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
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM sms_eot_crane_images WHERE log_id = $1`,
    [logId]
  );
  let order = Number(orderRes.rows[0].m) + 1;
  for (const { file, itemKey } of pairs) {
    await client.query(
      `INSERT INTO sms_eot_crane_images (log_id, item_key, file_path, original_name, mime_type, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [logId, itemKey, `${UPLOAD_SUBDIR}/${file.filename}`, file.originalname || null, file.mimetype || null, order++]
    );
  }
}

/** Another checklist for the same crane on the same day (one per day) */
async function findSameDayLog(shedName, craneNumber, reportDate, excludeId = null) {
  const res = await query(
    `SELECT id FROM sms_eot_crane_checklists
     WHERE shed_name = $1 AND crane_number = $2 AND report_date = $3::date AND ($4::int IS NULL OR id <> $4)
     LIMIT 1`,
    [shedName, craneNumber, reportDate, excludeId]
  );
  return res.rows[0] || null;
}

/** Schedule to link a new checklist to: the given one, or an open one for the same crane and day */
async function resolveSchedule(scheduleId, header) {
  if (scheduleId) {
    const res = await query(
      `SELECT s.*, l.id AS log_id
       FROM sms_eot_crane_schedules s
       LEFT JOIN sms_eot_crane_checklists l ON l.schedule_id = s.id
       WHERE s.id = $1`,
      [scheduleId]
    );
    const s = res.rows[0];
    if (!s) return { error: 'Schedule not found' };
    if (s.log_id) return { error: `Schedule #${s.id} is already done` };
    if (s.shed_name !== header.shed_name || s.crane_number !== header.crane_number) {
      return { error: `Schedule #${s.id} is for ${s.shed_name} Crane ${s.crane_number}` };
    }
    return { id: s.id };
  }
  const res = await query(
    `SELECT s.id
     FROM sms_eot_crane_schedules s
     LEFT JOIN sms_eot_crane_checklists l ON l.schedule_id = s.id
     WHERE s.shed_name = $1 AND s.crane_number = $2 AND s.planned_date = $3::date AND l.id IS NULL
     LIMIT 1`,
    [header.shed_name, header.crane_number, header.report_date]
  );
  return { id: res.rows[0]?.id || null };
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

class SmsEotCraneController {
  /* ---------------- Schedules (calendar) ---------------- */

  static async getSchedules(req, res) {
    try {
      const { date_from, date_to } = req.query;
      if (!ISO_DATE.test(date_from || '') || !ISO_DATE.test(date_to || '')) {
        return res.status(400).json({ success: false, message: 'date_from and date_to are required' });
      }
      const result = await query(
        `SELECT s.id, s.shed_name, s.crane_number, s.planned_date, s.created_at,
                u.username AS created_by_name, l.id AS log_id, l.report_date AS done_date, l.alert_count
         FROM sms_eot_crane_schedules s
         JOIN users u ON u.id = s.created_by
         LEFT JOIN sms_eot_crane_checklists l ON l.schedule_id = s.id
         WHERE s.planned_date BETWEEN $1::date AND $2::date
         ORDER BY s.planned_date, s.shed_name, s.crane_number`,
        [date_from, date_to]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('SMS EOT Crane getSchedules error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
    }
  }

  static async getScheduleById(req, res) {
    try {
      const result = await query(
        `SELECT s.*, l.id AS log_id
         FROM sms_eot_crane_schedules s
         LEFT JOIN sms_eot_crane_checklists l ON l.schedule_id = s.id
         WHERE s.id = $1`,
        [req.params.id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Schedule not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('SMS EOT Crane getScheduleById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
    }
  }

  /** Body: { planned_date, cranes: [{ shed_name, crane_number }] } — already scheduled cranes are skipped */
  static async createSchedules(req, res) {
    try {
      const { planned_date: plannedDate, cranes } = req.body || {};
      if (!ISO_DATE.test(plannedDate || '')) {
        return res.status(400).json({ success: false, message: 'Planned date is required' });
      }
      const list = Array.isArray(cranes) ? cranes : [];
      if (!list.length) {
        return res.status(400).json({ success: false, message: 'Select at least one crane' });
      }
      const bad = list.find((c) => !findCrane(c?.shed_name, c?.crane_number));
      if (bad) {
        return res.status(400).json({ success: false, message: `Unknown crane: ${bad?.shed_name} ${bad?.crane_number}` });
      }

      let created = 0;
      await transaction(async (client) => {
        for (const c of list) {
          const r = await client.query(
            `INSERT INTO sms_eot_crane_schedules (shed_name, crane_number, planned_date, created_by)
             VALUES ($1, $2, $3::date, $4)
             ON CONFLICT (shed_name, crane_number, planned_date) DO NOTHING`,
            [c.shed_name, String(c.crane_number), plannedDate, req.user.id]
          );
          created += r.rowCount;
        }
      });

      const skipped = list.length - created;
      res.status(201).json({
        success: true,
        message: `${created} schedule(s) added${skipped ? `, ${skipped} already scheduled` : ''}`,
        created,
      });
    } catch (error) {
      console.error('SMS EOT Crane createSchedules error:', error);
      res.status(500).json({ success: false, message: 'Failed to add schedules' });
    }
  }

  static async deleteSchedule(req, res) {
    try {
      const existing = await query(
        `SELECT s.id, l.id AS log_id
         FROM sms_eot_crane_schedules s
         LEFT JOIN sms_eot_crane_checklists l ON l.schedule_id = s.id
         WHERE s.id = $1`,
        [req.params.id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Schedule not found' });
      }
      if (existing.rows[0].log_id) {
        return res.status(400).json({ success: false, message: 'This schedule is already done and cannot be deleted' });
      }
      await query(`DELETE FROM sms_eot_crane_schedules WHERE id = $1`, [req.params.id]);
      res.json({ success: true, message: 'Schedule deleted' });
    } catch (error) {
      console.error('SMS EOT Crane deleteSchedule error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete schedule' });
    }
  }

  /* ---------------- Checklists ---------------- */

  static async getLogs(req, res) {
    try {
      const { date_from, date_to, shed_name, crane_number, limit } = req.query;
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
      if (shed_name) {
        params.push(shed_name);
        conditions.push(`l.shed_name = $${params.length}`);
      }
      if (crane_number) {
        params.push(String(crane_number));
        conditions.push(`l.crane_number = $${params.length}`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.id, l.schedule_id, l.report_date, l.recorded_by, l.shed_name, l.crane_number, l.crane_capacity,
                l.alert_count, l.created_at, u.username AS filled_by_name
         FROM sms_eot_crane_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_eot_crane_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS EOT Crane getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch EOT crane checklists' });
    }
  }

  static async _fetchLog(id) {
    const [result, imagesRes] = await Promise.all([
      query(
        `SELECT l.*, u.username AS filled_by_name, s.planned_date
         FROM sms_eot_crane_checklists l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN sms_eot_crane_schedules s ON s.id = l.schedule_id
         WHERE l.id = $1`,
        [id]
      ),
      query(`SELECT * FROM sms_eot_crane_images WHERE log_id = $1 ORDER BY sort_order, id`, [id]),
    ]);
    return { log: result.rows[0] || null, images: imagesRes.rows };
  }

  static async getById(req, res) {
    try {
      const { log, images } = await SmsEotCraneController._fetchLog(req.params.id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'EOT crane checklist not found' });
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
      console.error('SMS EOT Crane getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch EOT crane checklist' });
    }
  }

  /**
   * Validates the body against the crane's checked sections and the photos. Returns { error } or
   * { header, items, skipped, alertCount, keepPairs, dropFiles, keptRows }.
   */
  static _prepare(b, files, existingImages = []) {
    if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
    const recordedBy = nullIfEmpty(b.recorded_by);
    if (!recordedBy) return { error: 'Recorded By is required' };
    if (!nullIfEmpty(b.shed_name)) return { error: 'Shed is required' };
    if (!nullIfEmpty(b.crane_number)) return { error: 'Crane No. is required' };

    const crane = findCrane(b.shed_name, b.crane_number);
    if (!crane) return { error: 'Selected crane does not belong to the selected shed' };

    // Sections switched off in the form are skipped (not checked this time)
    const skipped = crane.sections.filter((k) => Array.isArray(b.skipped_sections) && b.skipped_sections.includes(k));
    const checked = crane.sections.filter((k) => !skipped.includes(k));
    if (!checked.length) return { error: 'At least one section must be checked' };

    const items = normalizeChecklistItems(b.checklist_items, checked);
    const wanted = photoItemKeys(items);
    const paired = pairNewFiles(files, b.new_image_item_keys, wanted);
    if (paired.error) return { error: paired.error };

    const keepIds = (Array.isArray(b.keep_image_ids) ? b.keep_image_ids : [])
      .map((x) => parseInt(x, 10))
      .filter((n) => !Number.isNaN(n));
    const keptRows = existingImages.filter((r) => keepIds.includes(r.id) && wanted.has(r.item_key));

    const error = findChecklistError(items, countPhotos(keptRows, paired.keep), checked);
    if (error) return { error };

    return {
      header: {
        report_date: b.report_date,
        recorded_by: recordedBy,
        shed_name: b.shed_name,
        crane_number: crane.number,
        crane_capacity: crane.capacity,
        general_remark: nullIfEmpty(b.general_remark),
        maintenance_start_time: normalizeTime(b.maintenance_start_time),
        maintenance_stop_time: normalizeTime(b.maintenance_stop_time),
      },
      items,
      skipped,
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
      const prep = SmsEotCraneController._prepare(b, uploaded);
      if (prep.error) return fail(400, prep.error);
      const h = prep.header;

      if (await findSameDayLog(h.shed_name, h.crane_number, h.report_date)) {
        return fail(409, duplicateDayMessage(h.shed_name, h.crane_number, h.report_date));
      }
      const schedule = await resolveSchedule(parseInt(b.schedule_id, 10) || null, h);
      if (schedule.error) return fail(400, schedule.error);
      cleanupUploadedFiles(prep.dropFiles);

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `INSERT INTO sms_eot_crane_checklists (
             schedule_id, report_date, recorded_by, shed_name, crane_number, crane_capacity,
             checklist_items, skipped_sections, alert_count, general_remark,
             maintenance_start_time, maintenance_stop_time, filled_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13)
           RETURNING *`,
          [
            schedule.id, h.report_date, h.recorded_by, h.shed_name, h.crane_number, h.crane_capacity,
            JSON.stringify(prep.items), JSON.stringify(prep.skipped), prep.alertCount, h.general_remark,
            h.maintenance_start_time, h.maintenance_stop_time, req.user.id,
          ]
        );
        log = result.rows[0];
        await insertImages(client, log.id, prep.keepPairs);
      });

      res.status(201).json({ success: true, message: 'EOT crane checklist saved', data: log });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'This crane / schedule is already filled for this day' });
      }
      console.error('SMS EOT Crane create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save EOT crane checklist' });
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
      const existing = await query(`SELECT * FROM sms_eot_crane_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) return fail(404, 'EOT crane checklist not found');
      const current = existing.rows[0];
      if (!isWithinEditWindow(current.created_at)) return fail(403, editWindowDeniedMessage());

      const existingImages = (await query(`SELECT * FROM sms_eot_crane_images WHERE log_id = $1`, [id])).rows;
      const b = parseMultipartBody(req);
      const prep = SmsEotCraneController._prepare(b, uploaded, existingImages);
      if (prep.error) return fail(400, prep.error);
      const h = prep.header;

      if (current.schedule_id && (h.shed_name !== current.shed_name || h.crane_number !== current.crane_number)) {
        return fail(400, 'Crane cannot be changed for a scheduled checklist');
      }
      if (await findSameDayLog(h.shed_name, h.crane_number, h.report_date, id)) {
        return fail(409, duplicateDayMessage(h.shed_name, h.crane_number, h.report_date));
      }
      cleanupUploadedFiles(prep.dropFiles);
      const keptIds = new Set(prep.keptRows.map((r) => r.id));
      const removedImages = existingImages.filter((r) => !keptIds.has(r.id));

      let log;
      await transaction(async (client) => {
        const result = await client.query(
          `UPDATE sms_eot_crane_checklists SET
             report_date = $1, recorded_by = $2, shed_name = $3, crane_number = $4, crane_capacity = $5,
             checklist_items = $6::jsonb, skipped_sections = $7::jsonb, alert_count = $8, general_remark = $9,
             maintenance_start_time = $10, maintenance_stop_time = $11, updated_at = NOW()
           WHERE id = $12
           RETURNING *`,
          [
            h.report_date, h.recorded_by, h.shed_name, h.crane_number, h.crane_capacity,
            JSON.stringify(prep.items), JSON.stringify(prep.skipped), prep.alertCount, h.general_remark,
            h.maintenance_start_time, h.maintenance_stop_time, id,
          ]
        );
        log = result.rows[0];
        if (removedImages.length) {
          await client.query(`DELETE FROM sms_eot_crane_images WHERE id = ANY($1::int[])`, [removedImages.map((r) => r.id)]);
        }
        await insertImages(client, log.id, prep.keepPairs);
      });
      removedImages.forEach((r) => unlinkUpload(r.file_path));

      res.json({ success: true, message: 'EOT crane checklist updated', data: log });
    } catch (error) {
      cleanupUploadedFiles(uploaded);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'This crane is already filled for this day' });
      }
      console.error('SMS EOT Crane update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update EOT crane checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT * FROM sms_eot_crane_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'EOT crane checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const images = await query(`SELECT file_path FROM sms_eot_crane_images WHERE log_id = $1`, [id]);
      await query(`DELETE FROM sms_eot_crane_checklists WHERE id = $1`, [id]);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({ success: true, message: 'EOT crane checklist deleted' });
    } catch (error) {
      console.error('SMS EOT Crane delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete EOT crane checklist' });
    }
  }

  static async clearAll(req, res) {
    try {
      const images = await query(`SELECT file_path FROM sms_eot_crane_images`);
      const result = await query(`DELETE FROM sms_eot_crane_checklists RETURNING id`);
      images.rows.forEach((img) => unlinkUpload(img.file_path));
      res.json({
        success: true,
        message: `Deleted ${result.rowCount} EOT crane checklist(s)`,
        deleted: result.rowCount,
      });
    } catch (error) {
      console.error('SMS EOT Crane clearAll error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete all EOT crane history' });
    }
  }

  static async downloadPDF(req, res) {
    const { id } = req.params;
    try {
      const { log, images } = await SmsEotCraneController._fetchLog(id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'EOT crane checklist not found' });
      }
      const items = log.checklist_items || {};
      const skipped = Array.isArray(log.skipped_sections) ? log.skipped_sections : [];

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
        `attachment; filename=sms_eot_crane_maintenance_${id}_${log.report_date || 'report'}.pdf`
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
        .text('EOT Crane Preventive Maintenance — Mechanical', margin + 60, y + 8, { width: pageW - 60 });
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(`SMS Checksheets · ${EOT_DEPARTMENT_NAME}`, margin + 60, y + 28, { width: pageW - 60 });
      y = 70;

      const hhmm = (t) => (t ? String(t).slice(0, 5) : '—');
      const meta = [
        ['Date', formatDateOnly(log.report_date)],
        ['Shed', log.shed_name || '—'],
        ['Crane No.', craneLabel(log.crane_number, log.crane_capacity)],
        ['Schedule', log.schedule_id ? `#${log.schedule_id} · Planned ${formatDateOnly(log.planned_date)}` : 'Not scheduled'],
        ['Recorded By', log.recorded_by || '—'],
        ['Maintenance Time', `${hhmm(log.maintenance_start_time)} to ${hhmm(log.maintenance_stop_time)}`],
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
        { label: 'Check Point', w: 170 },
        { label: 'Status', w: 105 },
        { label: 'Remark', w: pageW - 22 - 170 - 105 },
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

      EOT_SECTIONS.filter((s) => items[s.key] || skipped.includes(s.key)).forEach((section, sIdx) => {
        if (y + 50 > pageBottom) {
          doc.addPage();
          y = 30;
        }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#78350f')
          .text(`${sIdx + 1}. ${section.label}`, margin, y, { width: pageW });
        y = doc.y + 4;
        if (!items[section.key]) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#6b7280')
            .text('Not checked (section switched off)', margin + 4, y, { width: pageW });
          y = doc.y + 12;
          return;
        }
        drawColumnHeader();

        section.points.forEach((p, pIdx) => {
          const row = items[section.key]?.[p.key] || {};
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
        y += 12;
      });

      if (log.general_remark) {
        if (y + 40 > pageBottom) {
          doc.addPage();
          y = 30;
        }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#78350f').text('Remark', margin, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(log.general_remark, margin, y, { width: pageW });
      }

      drawPhotoPages(
        doc,
        images,
        items,
        `${formatDateOnly(log.report_date)} · ${log.shed_name || '—'} · ${craneLabel(log.crane_number, log.crane_capacity)}`
      );

      doc.end();
      await new Promise((resolve) => doc.on('end', resolve));
      res.end(Buffer.concat(buffers));
    } catch (error) {
      console.error('SMS EOT Crane PDF error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    }
  }
}

module.exports = SmsEotCraneController;
