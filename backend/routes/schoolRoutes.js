// backend/routes/schoolRoutes.js
const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { verifyToken, verifySuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/uploadLogo');

// ─────────────── PUBLIC (no auth) ───────────────
router.get('/public', schoolController.listPublicSchools);
router.get('/:id/profile', schoolController.getSchoolProfile);

// ─────────────── SUPER ADMIN ONLY ───────────────
router.get('/admin/all', verifyToken, verifySuperAdmin, schoolController.getAllSchools);
router.post('/admin/create', verifyToken, verifySuperAdmin, schoolController.createSchool);
router.put('/admin/:id', verifyToken, verifySuperAdmin, schoolController.updateSchool);

// ⚡ NEW: Logo upload
router.post(
  '/admin/upload-logo',
  verifyToken,
  verifySuperAdmin,
  upload,
  schoolController.uploadSchoolLogo
);

module.exports = router;