// routes/teacherAssignmentRoutes.js
const express = require('express');
const router = express.Router();
const TeacherAssignmentController = require('../controllers/TeacherAssignmentController');
const { verifyAdmin, verifyTeacher } = require('../middleware/auth');

// ─── ADMIN ──────────────────────────────────────────────
router.post('/', verifyAdmin, TeacherAssignmentController.createAssignment);
router.delete('/:id', verifyAdmin, TeacherAssignmentController.deleteAssignment);
router.get('/distinct-class-names', verifyAdmin, TeacherAssignmentController.getDistinctClassNamesForAdmin);

// ─── TEACHER ────────────────────────────────────────────
router.get('/:teacher_id', verifyTeacher, TeacherAssignmentController.getAssignmentsForTeacher);

module.exports = router;