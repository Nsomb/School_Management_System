// backend/routes/reportCardRoutes.js
const express = require("express");
const router = express.Router();
const reportCardController = require("../controllers/reportCardController");
const { verifyStaff } = require("../middleware/auth");
const { verifyAdmin } = require("../middleware/auth");

// ─── READ ───────────────────────────────────────────────
router.get("/classes", verifyStaff, reportCardController.getClasses);
router.get("/students", verifyStaff, reportCardController.getStudents);
router.get("/terms", verifyStaff, reportCardController.getTerms);

// ─── GENERATE ───────────────────────────────────────────
router.post("/generate", verifyStaff, reportCardController.generateStudentReport);
router.post("/generate-class", verifyStaff, reportCardController.generateClassReport);
router.post("/generate-final", verifyStaff, reportCardController.generateFinalYearReport);
router.post("/generate-honour", verifyStaff, reportCardController.generateHonourRoll);
router.post("/generate-honour-batch", verifyStaff, reportCardController.generateBatchHonourRoll);

// ─── DOWNLOAD (per-school folder) ───────────────────────
router.get("/download/:schoolId/:filename", verifyStaff, reportCardController.downloadReport);

// ─── CLEANUP ────────────────────────────────────────────
router.delete("/cleanup", verifyAdmin, reportCardController.cleanupReports);

module.exports = router;