// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const classStatisticsController = require("../controllers/classStatisticsController");
const { verifyAdmin } = require("../middleware/auth");
const { verifySuperAdmin } = require("../middleware/auth");

// ─── PUBLIC ───
router.post("/login", AuthController.login);

// ─── SUPER ADMIN ONLY ───
// Registration is now handled by /api/super-admin/schools/:schoolId/admins
// This legacy endpoint is kept for compatibility but locked down.
router.post("/register", verifySuperAdmin, AuthController.register);

// ─── ADMIN-ONLY ───
router.post('/class-statistics', verifyAdmin, classStatisticsController.getClassPerformanceStatistics);

module.exports = router;