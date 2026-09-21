// backend/routes/classRoutes.js
const express = require("express");
const router = express.Router();
const ClassController = require("../controllers/classController");
const StudentModel = require("../models/studentModel");
const { verifyToken, verifyAdmin, verifyTeacher } = require("../middleware/auth");

// ─── READ ──────────────────────────────────────────────
router.get("/", verifyToken, ClassController.getAll);

// ─── CREATE / UPDATE / DELETE (admin only) ────────────
router.post("/", verifyAdmin, ClassController.create);
router.put("/:id", verifyAdmin, ClassController.update);
router.delete("/:id", verifyAdmin, ClassController.delete);

// ─── TEACHER: students in a class ──────────────────────
router.get("/:classId/students", verifyTeacher, async (req, res) => {
  try {
    const { classId } = req.params;
    const schoolId = req.schoolId;
    if (!schoolId) return res.status(403).json({ error: "No school context." });
    const students = await StudentModel.getStudentsByClassId(classId, schoolId);
    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students by class ID:", error);
    res.status(500).json({ message: "Failed to retrieve students.", error: error.message });
  }
});

module.exports = router;