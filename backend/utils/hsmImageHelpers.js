const fs = require('fs');
const { unlinkUpload } = require('../middleware/upload');

function parseMultipartBody(req) {
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

/** Returns an async saveImages(client, logId, files, keepImageIds) bound to one images table. */
function makeImageSaver(tableName, uploadSubdir) {
  return async function saveImages(client, logId, files, keepImageIds) {
    const keepIds = Array.isArray(keepImageIds)
      ? keepImageIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n))
      : null;

    if (keepIds) {
      const existing = await client.query(`SELECT * FROM ${tableName} WHERE log_id = $1`, [logId]);
      for (const row of existing.rows) {
        if (!keepIds.includes(row.id)) {
          await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [row.id]);
          unlinkUpload(row.file_path);
        }
      }
    }

    const orderRes = await client.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS m FROM ${tableName} WHERE log_id = $1`,
      [logId]
    );
    let order = Number(orderRes.rows[0].m) + 1;

    for (const file of files || []) {
      const relative = `${uploadSubdir}/${file.filename}`;
      await client.query(
        `INSERT INTO ${tableName} (log_id, file_path, original_name, mime_type, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [logId, relative, file.originalname || null, file.mimetype || null, order++]
      );
    }
  };
}

function mapImageRows(rows) {
  return rows.map((img) => ({
    id: img.id,
    original_name: img.original_name,
    url: `/uploads/${img.file_path.replace(/^[/\\]+/, '')}`,
  }));
}

module.exports = {
  parseMultipartBody,
  cleanupUploadedFiles,
  makeImageSaver,
  mapImageRows,
};
