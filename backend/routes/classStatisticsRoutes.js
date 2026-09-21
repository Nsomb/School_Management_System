// routes/classStatisticsRoutes.js
const express = require('express');
const router = express.Router();
const ClassStatisticsController = require('../controllers/classStatisticsController');
const { verifyAdmin, verifyTeacher, verifyToken } = require('../middleware/auth');

// ─── ADMIN ──────────────────────────────────────────────
router.get('/', verifyAdmin, ClassStatisticsController.getClassPerformanceStatistics);
router.post('/download', verifyAdmin, ClassStatisticsController.downloadClassStatistics);
router.get('/admin', verifyAdmin, ClassStatisticsController.getClassPerformanceStatistics);
router.post('/admin/download', verifyAdmin, ClassStatisticsController.downloadClassStatistics);

// ─── TEACHER ────────────────────────────────────────────
router.get('/teacher', verifyTeacher, ClassStatisticsController.getTeacherClassStatistics);
router.post('/teacher/download', verifyTeacher, ClassStatisticsController.downloadTeacherClassStatistics);
router.get('/teacher/subjects', verifyTeacher, ClassStatisticsController.getTeacherSubjectsWithClasses);

// ─── SHARED (authenticated) ─────────────────────────────
router.get('/terms', verifyToken, ClassStatisticsController.getAvailableTerms);
router.get('/academic-years', verifyToken, ClassStatisticsController.getAcademicYears);

module.exports = router;