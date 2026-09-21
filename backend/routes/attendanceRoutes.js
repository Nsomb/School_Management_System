const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/AttendanceController');
const { verifyAdmin } = require('../middleware/auth');
const { verifyTeacher } = require('../middleware/auth');

router.get('/dashboard', verifyAdmin, AttendanceController.getAttendanceDashboard);

router.get('/students/class/:className', verifyAdmin, AttendanceController.getStudentsByClass);
router.post('/students/class/mark', verifyAdmin, AttendanceController.markClassAttendance);
router.get('/students', verifyAdmin, AttendanceController.getStudentAttendances);
router.post('/students', verifyAdmin, AttendanceController.markStudentAttendance);
router.delete('/students/:id', verifyAdmin, AttendanceController.deleteStudentAttendance);

router.post('/students/lock', verifyAdmin, AttendanceController.lockStudentAttendance);
router.post('/students/unlock', verifyAdmin, AttendanceController.unlockStudentAttendance);

router.get('/teacher/students/class/:className', verifyTeacher, AttendanceController.getTeacherStudentsByClass);
router.post('/teacher/students/class/mark', verifyTeacher, AttendanceController.markTeacherClassAttendance);
router.get('/teacher/students', verifyTeacher, AttendanceController.getTeacherStudentAttendances);

router.get('/teachers/list', verifyAdmin, AttendanceController.getAllTeachersForAttendance);
router.get('/teachers/schedule', verifyAdmin, AttendanceController.getTeachersForDate);
router.post('/teachers', verifyAdmin, AttendanceController.markTeacherAttendance);
router.post('/teachers/bulk', verifyAdmin, AttendanceController.markTeachersAttendance);
router.get('/teachers', verifyAdmin, AttendanceController.getTeacherAttendances);
router.delete('/teachers/:id', verifyAdmin, AttendanceController.deleteTeacherAttendance);

router.post('/teachers/lock', verifyAdmin, AttendanceController.lockTeacherAttendance);
router.post('/teachers/unlock', verifyAdmin, AttendanceController.unlockTeacherAttendance);

router.post('/expected-days', verifyAdmin, AttendanceController.setExpectedDays);
router.post('/expected-days/bulk', verifyAdmin, AttendanceController.setBulkExpectedDays);
router.get('/expected-days/teacher/:teacherId', verifyAdmin, AttendanceController.getExpectedDaysByTeacher);
router.get('/expected-days/all', verifyAdmin, AttendanceController.getAllTeachersWithExpectedDays);
router.get('/expected-days/summary', verifyAdmin, AttendanceController.getExpectedDaysSummary);
router.delete('/expected-days/:id', verifyAdmin, AttendanceController.deleteExpectedDay);

router.post('/teacher/my-expected-days', verifyTeacher, AttendanceController.setTeacherExpectedDays);
router.post('/teacher/my-expected-days/bulk', verifyTeacher, AttendanceController.setTeacherBulkExpectedDays);
router.get('/teacher/my-expected-days/:teacherId', verifyTeacher, AttendanceController.getTeacherExpectedDays);

router.get('/students/summary', verifyAdmin, AttendanceController.getMonthlyStudentSummary);
router.get('/teachers/summary', verifyAdmin, AttendanceController.getMonthlyTeacherSummary);

router.get('/reports/students-absent', verifyAdmin, AttendanceController.getStudentAbsenceReport);
router.get('/reports/teachers-absent', verifyAdmin, AttendanceController.getTeacherAbsenceReport);
router.get('/reports/teachers-summary', verifyAdmin, AttendanceController.getDetailedTeacherAbsenceSummary);
router.get('/reports/export/pdf', verifyAdmin, AttendanceController.exportReportPdf);

router.get('/teacher/reports/my-classes', verifyTeacher, AttendanceController.getTeacherClassReports);

router.post('/archive-year/:academic_year', verifyAdmin, AttendanceController.archiveAttendanceRecords);
router.get('/archive/logs', verifyAdmin, AttendanceController.getArchiveLogs);
router.post('/archive/restore/:archive_batch_id', verifyAdmin, AttendanceController.restoreArchiveBatch);
router.delete('/archive/:archive_batch_id', verifyAdmin, AttendanceController.purgeArchiveBatch);
router.post('/archive/purge/older-than', verifyAdmin, AttendanceController.purgeArchivesOlderThan);
router.get('/current-stats', verifyAdmin, AttendanceController.getCurrentAcademicYearStats);
router.get('/stats/:academic_year', verifyAdmin, AttendanceController.getAttendanceStatsByAcademicYear);

module.exports = router;