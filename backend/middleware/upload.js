const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '../uploads');
const ROLL_CHANGE_DIR = path.join(UPLOAD_ROOT, 'hsm-roll-change');
const RM_DAILY_DIR = path.join(UPLOAD_ROOT, 'hsm-rm-daily');

if (!fs.existsSync(ROLL_CHANGE_DIR)) {
  fs.mkdirSync(ROLL_CHANGE_DIR, { recursive: true });
}
if (!fs.existsSync(RM_DAILY_DIR)) {
  fs.mkdirSync(RM_DAILY_DIR, { recursive: true });
}

const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
  }
};

function makeImageUpload(dirName, prefix) {
  const dir = path.join(UPLOAD_ROOT, dirName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
      cb(null, `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
  });
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  }).array('images', 10);
}

const rollChangeImageUpload = makeImageUpload('hsm-roll-change', 'rc');
const rmDailyImageUpload = makeImageUpload('hsm-rm-daily', 'rm');
const breakdownAnalysisImageUpload = makeImageUpload('hsm-breakdown-analysis', 'ba');
const delayReportImageUpload = makeImageUpload('hsm-delay-report', 'dr');
const fmDailyImageUpload = makeImageUpload('hsm-fm-daily', 'fm');
const inductionDailyImageUpload = makeImageUpload('hsm-induction-daily', 'ind');
const dcDailyImageUpload = makeImageUpload('hsm-dc-daily', 'dc');

const excelMemoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const okMime = /spreadsheet|excel|csv|octet-stream/i.test(file.mimetype || '');
    const okExt = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
    if (okMime || okExt) cb(null, true);
    else cb(new Error('Only Excel files (.xlsx) are allowed'));
  },
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
}).single('file');

function absoluteUploadPath(relativePath) {
  if (!relativePath) return null;
  const cleaned = String(relativePath).replace(/^[/\\]+/, '').replace(/\.\./g, '');
  return path.join(UPLOAD_ROOT, cleaned);
}

function unlinkUpload(relativePath) {
  try {
    const abs = absoluteUploadPath(relativePath);
    if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error('Failed to delete upload:', relativePath, err.message);
  }
}

module.exports = {
  UPLOAD_ROOT,
  ROLL_CHANGE_DIR,
  RM_DAILY_DIR,
  rollChangeImageUpload,
  rmDailyImageUpload,
  breakdownAnalysisImageUpload,
  delayReportImageUpload,
  fmDailyImageUpload,
  inductionDailyImageUpload,
  dcDailyImageUpload,
  excelMemoryUpload,
  absoluteUploadPath,
  unlinkUpload,
};
