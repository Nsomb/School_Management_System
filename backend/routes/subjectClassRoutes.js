// routes/subjectClassRoutes.js
const express = require('express');
const router = express.Router();
const SubjectClassController = require('../controllers/SubjectClassController');
const { verifyAdmin, verifyTeacher } = require('../middleware/auth');

// ─── ADMIN ──────────────────────────────────────────────
router.post('/', verifyAdmin, SubjectClassController.createSubjectClass);
router.post('/batch', verifyAdmin, SubjectClassController.createBatchSubjectClasses);
router.put('/:id', verifyAdmin, SubjectClassController.updateSubjectClass);
router.delete('/:id', verifyAdmin, SubjectClassController.deleteSubjectClass);
router.delete('/subject/:subject_id', verifyAdmin, SubjectClassController.deleteBySubject);
router.delete('/class/:class_name', verifyAdmin, SubjectClassController.deleteByClass);

router.get('/all', verifyAdmin, SubjectClassController.getAllSubjectClasses);
router.get('/admin/subjects-for/:class_name', verifyAdmin, SubjectClassController.getSubjectsForClass);
router.get('/class/:class_id/subjects', verifyAdmin, SubjectClassController.getSubjectsByClassId);

// ─── TEACHER ────────────────────────────────────────────
router.get('/subjects-for/:class_name', verifyTeacher, SubjectClassController.getSubjectsForClass);
router.get('/distinct-class-names', verifyTeacher, SubjectClassController.getDistinctClassNames);

// ─── ADMIN ──────────────────────────────────────────────
router.get('/classes-with-subjects', verifyAdmin, SubjectClassController.getClassesWithSubjectCounts);

module.exports = router;