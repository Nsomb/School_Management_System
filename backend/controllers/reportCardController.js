// backend/controllers/reportCardController.js
const path = require("path");
const fs = require("fs");
const ReportCardService = require("../services/ReportCardService");
const { handleRequest } = require("../utils/helpers");

const sanitizeFilename = (filename) =>
  path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');

// ─── GET /classes ─────────────────────────────────────────
exports.getClasses = async (req, res) => {
  handleRequest(res, () => ReportCardService.getClasses(req.schoolId));
};

// ─── GET /students?class_name=... ────────────────────────
exports.getStudents = async (req, res) => {
  const { class_name } = req.query;
  if (!class_name) throw new Error("class_name is required");
  handleRequest(res, () => ReportCardService.getStudents(class_name, req.schoolId));
};

// ─── GET /terms ──────────────────────────────────────────
exports.getTerms = async (req, res) => {
  handleRequest(res, () => ReportCardService.getTerms(req.schoolId));
};

// ─── POST /generate ──────────────────────────────────────
exports.generateStudentReport = async (req, res) => {
  const { student_id, class_name, term } = req.body;
  if (!student_id || !class_name || !term) {
    throw new Error("Missing required fields: student_id, class_name, term");
  }
  handleRequest(res, () =>
    ReportCardService.generateStudentReport(student_id, class_name, term, req.schoolId)
  );
};

// ─── POST /generate-class ────────────────────────────────
exports.generateClassReport = async (req, res) => {
  const { class_name, term } = req.body;
  if (!class_name || !term) {
    throw new Error("Missing required fields: class_name, term");
  }
  handleRequest(res, () =>
    ReportCardService.generateClassReport(class_name, term, req.schoolId)
  );
};

// ─── POST /generate-final ────────────────────────────────
exports.generateFinalYearReport = async (req, res) => {
  const { student_id, class_name } = req.body;
  if (!student_id || !class_name) {
    throw new Error("Missing required fields: student_id, class_name");
  }
  handleRequest(res, () =>
    ReportCardService.generateFinalYearReport(student_id, class_name, req.schoolId)
  );
};

// ─── POST /generate-honour ───────────────────────────────
exports.generateHonourRoll = async (req, res) => {
  const { student_id, class_name, term } = req.body;
  if (!student_id || !class_name || !term) {
    throw new Error("Missing required fields: student_id, class_name, term");
  }
  handleRequest(res, () =>
    ReportCardService.generateHonourRoll(student_id, class_name, term, req.schoolId)
  );
};

// ─── POST /generate-honour-batch ─────────────────────────
exports.generateBatchHonourRoll = async (req, res) => {
  const { class_name, term } = req.body;
  if (!class_name || !term) {
    throw new Error("Missing required fields: class_name, term");
  }
  handleRequest(res, () =>
    ReportCardService.generateBatchHonourRoll(class_name, term, req.schoolId)
  );
};

// ─── GET /download/:schoolId/:filename ───────────────────
exports.downloadReport = async (req, res) => {
  const { schoolId: schoolFolder, filename } = req.params;
  const safeFilename = sanitizeFilename(filename);
  if (!safeFilename) return res.status(400).json({ error: "Invalid filename" });

  // Validate the school folder matches the requesting school
  const expectedFolder = `school_${req.schoolId}`;
  if (schoolFolder !== expectedFolder) {
    return res.status(403).json({ error: "Access denied" });
  }

  const filePath = path.join(__dirname, "..", "uploads", "reports", schoolFolder, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "File not found" });
    }
  });
};

// ─── DELETE /cleanup ─────────────────────────────────────
exports.cleanupReports = async (req, res) => {
  handleRequest(res, async () => {
    await ReportCardService.cleanupReports(0, req.schoolId);
    return { message: "All reports deleted" };
  });
};