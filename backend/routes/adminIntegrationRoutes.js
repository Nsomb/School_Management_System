// adminIntegrationRoutes.js
const express = require("express");
const router = express.Router();
const ReportCardService = require("../services/ReportCardService");
const MarkModel = require("../models/markModel");
const { verifyAdmin } = require("../middleware/auth");

// Get marks overview for admin
router.get("/marks-overview", verifyAdmin, async (req, res) => {
  try {
    const { class_name, term } = req.query;
    const schoolId = req.schoolId;

    if (!class_name || !term) {
      return res.status(400).json({ error: "class_name and term are required." });
    }

    const students = await ReportCardService.getStudents(class_name, schoolId);
    const evaluationTypes = EvaluationConfig.termEvaluationMapping[term];

    const marksOverview = await Promise.all(
      students.map(async (student) => {
        const marksData = await ReportCardService.getStudentMarksForReport(
          student.id, class_name, term, schoolId
        );
        const hasMarks = Object.keys(marksData.subjectMarks).length > 0;
        return {
          studentId: student.id,
          studentName: student.name,
          hasMarks,
          marksCount: Object.values(marksData.subjectMarks).reduce(
            (count, subject) => count + Object.keys(subject.marks).length, 0
          ),
        };
      })
    );

    res.json({
      class: class_name,
      term,
      evaluationTypes,
      students: marksOverview,
      summary: {
        totalStudents: students.length,
        studentsWithMarks: marksOverview.filter((s) => s.hasMarks).length,
        completeness: `${((marksOverview.filter((s) => s.hasMarks).length / (students.length || 1)) * 100).toFixed(1)}%`,
      },
    });
  } catch (error) {
    console.error("Error getting marks overview:", error);
    res.status(500).json({ error: "Failed to get marks overview" });
  }
});

module.exports = router;