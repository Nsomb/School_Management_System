// routes/classStatisticsRoutes.js
const express = require('express');
const router = express.Router();
const ClassStatisticsController = require('../controllers/classStatisticsController');
const { verifyAdmin, verifyTeacher, verifyToken } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════
// NEW SHARED ROUTE — must come BEFORE any route with :id
// ═══════════════════════════════════════════════════════
router.get('/current-academic-year', ClassStatisticsController.getCurrentAcademicYear);

// ═══════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════
router.get('/', verifyAdmin, ClassStatisticsController.getClassPerformanceStatistics);
router.post('/download', verifyAdmin, ClassStatisticsController.downloadClassStatistics);

// ═══════════════════════════════════════════════════════
// SHARED META ROUTES
// ═══════════════════════════════════════════════════════
router.get('/terms', ClassStatisticsController.getAvailableTerms);
router.get('/academic-years', ClassStatisticsController.getAcademicYears);

// ═══════════════════════════════════════════════════════
// TEACHER ROUTES
// ═══════════════════════════════════════════════════════
router.get('/teacher/subjects', verifyTeacher, ClassStatisticsController.getTeacherSubjectsWithClasses);
router.get('/teacher', verifyTeacher, ClassStatisticsController.getTeacherClassStatistics);
router.post('/teacher/download', verifyTeacher, ClassStatisticsController.downloadTeacherClassStatistics);

module.exports = router;