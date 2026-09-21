// backend/middleware/uploadLogo.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the logos directory exists
const LOGO_DIR = path.join(__dirname, '..', 'uploads', 'logos');
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `logo_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only PNG, JPG, WEBP, and SVG files are allowed.'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single('logo');