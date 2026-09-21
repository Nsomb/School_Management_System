// backend/routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { verifySuperAdmin } = require('../middleware/auth');

// Every route here is super-admin only
router.use(verifySuperAdmin);

// ─── School admins management ──────────────────────────
router.get('/schools/:schoolId/admins', superAdminController.listSchoolAdmins);
router.post('/schools/:schoolId/admins', superAdminController.createSchoolAdmin);

// ─── Individual admin CRUD ─────────────────────────────
router.put('/admins/:adminId', superAdminController.updateSchoolAdmin);
router.delete('/admins/:adminId', superAdminController.deleteSchoolAdmin);

module.exports = router;