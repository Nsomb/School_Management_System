// backend/routes/classStatisticsRoutes.js
const express = require('express');
const router = express.Router();
const ClassStatisticsController = require('../controllers/classStatisticsController');
const { verifyTeacher, verifyAdmin } = require('../middleware/auth');

// ─── SHARED ───
router.get('/current-academic-year', ClassStatisticsController.getCurrentAcademicYear);  // ← NEW
router.get('/terms', ClassStatisticsController.getAvailableTerms);
router.get('/academic-years', ClassStatisticsController.getAcademicYears);

// ─── TEACHER ───
router.get('/teacher/subjects', verifyTeacher, ClassStatisticsController.getTeacherSubjectsWithClasses);
router.get('/teacher', verifyTeacher, ClassStatisticsController.getTeacherClassStatistics);
router.post('/teacher/download', verifyTeacher, ClassStatisticsController.downloadTeacherClassStatistics);

// ─── ADMIN ───
router.get('/admin', verifyAdmin, ClassStatisticsController.getClassPerformanceStatistics);
router.post('/admin/download', verifyAdmin, ClassStatisticsController.downloadClassStatistics);

module.exports = router;