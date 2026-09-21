// routes/timetableConfigRoutes.js
const express = require('express');
const router = express.Router();
const TimetableConfigController = require('../controllers/TimetableConfigController');
const { verifyAdmin } = require('../middleware/auth');

// ─── PERIODS ────────────────────────────────────────────
router.get('/periods', verifyAdmin, TimetableConfigController.getPeriods);

// ─── TEACHER AVAILABILITIES ─────────────────────────────
router.post('/teacher-availabilities', verifyAdmin, TimetableConfigController.createTeacherAvailability);
router.get('/teacher-availabilities/:teacher_id', verifyAdmin, TimetableConfigController.getTeacherAvailabilities);
router.delete('/teacher-availabilities/:id', verifyAdmin, TimetableConfigController.deleteTeacherAvailability);

// ─── TEACHER-SUBJECT-CLASS ASSIGNMENTS ──────────────────
router.post('/teacher-subject-classes', verifyAdmin, TimetableConfigController.createTeacherSubjectClass);
router.get('/teacher-subject-classes', verifyAdmin, TimetableConfigController.getAllTeacherSubjectClasses);
router.get('/teacher-subject-classes/:id', verifyAdmin, TimetableConfigController.getTeacherSubjectClassById);
router.put('/teacher-subject-classes/:id', verifyAdmin, TimetableConfigController.updateTeacherSubjectClass);
router.delete('/teacher-subject-classes/:id', verifyAdmin, TimetableConfigController.deleteTeacherSubjectClass);

module.exports = router;