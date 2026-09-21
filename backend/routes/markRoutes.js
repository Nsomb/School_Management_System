// backend/routes/markRoutes.js
const express = require('express');
const router = express.Router();
const MarkController = require('../controllers/MarkController');
const { verifyTeacher } = require('../middleware/auth');

// ==================== TEACHER ROUTES ====================
// Mounted in server.js as: apiRouter.use("/marks", markRoutes); app.use("/api", apiRouter)
// -> real prefix is /api/marks

// Get teacher's assigned subjects
router.get('/teacher/subjects', verifyTeacher, MarkController.getTeacherSubjects);

// Get available evaluation types
router.get('/evaluations', verifyTeacher, MarkController.getAvailableEvaluations);

// Get marks for a specific evaluation
router.get('/evaluation', verifyTeacher, MarkController.getEvaluationMarks);

// Get / read back competency for a subject/class/evaluation combination
router.get('/competency', verifyTeacher, MarkController.getCompetency);

// Get marks for a term (two evaluations)
router.get('/term', verifyTeacher, MarkController.getTermMarks);

// Save single evaluation marks (PRIMARY ENTRY POINT)
router.post('/single', verifyTeacher, MarkController.submitSingleEvaluation);

// Save term marks (two evaluations at once)
router.post('/term', verifyTeacher, MarkController.submitTermMarks);

// Legacy routes (kept for backward compatibility)
router.post('/batch', verifyTeacher, MarkController.submitMarksBatch);
router.get('/existing', verifyTeacher, MarkController.getExistingMarks);

module.exports = router;