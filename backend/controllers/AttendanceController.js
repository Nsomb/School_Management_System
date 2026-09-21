// backend/controllers/AttendanceController.js
const AttendanceModel = require('../models/AttendanceModel');
const { getCurrentAcademicYearAndTerm } = require('./academicYearController');
const { handleRequest } = require('../utils/responseHandler');
const PDFDocument = require('pdfkit');
const {
  studentAttendanceSchema,
  teacherBulkAttendanceSchema,
  teacherAttendanceSchema,
  monthlySummarySchema,
  expectedDaysSchema,
  bulkExpectedDaysSchema
} = require('../validators/attendanceValidator');

// ─── HELPERS ────────────────────────────────────────────────
const normalizeDate = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) throw new Error('Invalid date');
  return dt.toISOString().slice(0, 10);
};

const getMarkedBy = (req) => {
  const teacher = req.teacher;
  if (teacher) {
    const tid = teacher.teacherId || teacher.id;
    if (tid) return String(tid);
  }
  const user = req.user;
  if (user) {
    const id = user.id || user.userId || user.sub || user.user_id;
    if (id) return String(id);
  }
  throw new Error('Unable to determine who is marking attendance');
};

// ⚡ NEW: Extract schoolId from whichever middleware ran
const getSchoolId = (req) => {
  const sid = req.schoolId || req.user?.schoolId || req.teacher?.schoolId;
  if (!sid) throw new Error('No school context available');
  return sid;
};

// ─── DASHBOARD ──────────────────────────────────────────────
exports.getAttendanceDashboard = async (req, res) => {
  await handleRequest(res, async () => {
    const { dateFrom, dateTo } = req.query;
    const defaultDateFrom = new Date(); defaultDateFrom.setDate(1);
    const defaultDateTo = new Date();
    const stats = await AttendanceModel.getAttendanceStats(
      dateFrom || defaultDateFrom.toISOString().slice(0, 10),
      dateTo || defaultDateTo.toISOString().slice(0, 10),
      getSchoolId(req)
    );
    return { message: 'Dashboard stats retrieved', stats };
  });
};

// ─── STUDENTS ──────────────────────────────────────────────
exports.getStudentsByClass = async (req, res) => {
  await handleRequest(res, async () => {
    const { className } = req.params;
    if (!className) throw new Error('className is required');
    const students = await AttendanceModel.getStudentsByClass(className, getSchoolId(req));
    return { message: 'Students retrieved', students };
  });
};

exports.markClassAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const markedBy = getMarkedBy(req);
    const schoolId = getSchoolId(req);
    const { className, attendanceDate, records } = req.body;
    if (!className || !attendanceDate || !records || !records.length) throw new Error('Missing required fields');
    for (const record of records) {
      const { error } = studentAttendanceSchema.validate(record);
      if (error) throw new Error(`Invalid record for student ${record.studentId}: ${error.details[0].message}`);
    }
    const normalizedDate = normalizeDate(attendanceDate);
    const { academicYear, term } = await getCurrentAcademicYearAndTerm(new Date(normalizedDate));
    const result = await AttendanceModel.markClassAttendance(
      className, normalizedDate, markedBy, records, academicYear, term, schoolId
    );
    return { message: `Attendance marked for ${result.count} students`, result };
  });
};

exports.markStudentAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const markedBy = getMarkedBy(req);
    const schoolId = getSchoolId(req);
    const { studentId, className, attendanceDate, status, reason } = req.body;
    if (!studentId || !className || !attendanceDate || !status) throw new Error('Missing required fields');
    const { error } = studentAttendanceSchema.validate({ studentId, status, reason });
    if (error) throw new Error(error.details[0].message);
    const normalizedDate = normalizeDate(attendanceDate);
    const { academicYear, term } = await getCurrentAcademicYearAndTerm(new Date(normalizedDate));
    const record = await AttendanceModel.markSingleStudentAttendance(
      studentId, className, normalizedDate, status, reason, markedBy, academicYear, term, schoolId
    );
    return { message: 'Student attendance marked', record };
  });
};

exports.getStudentAttendances = async (req, res) => {
  await handleRequest(res, async () => {
    const { page = 1, limit = 50, className, dateFrom, dateTo, studentId, academicYear, term } = req.query;
    const attendances = await AttendanceModel.getAllStudentAttendances(
      { page: parseInt(page), limit: parseInt(limit), className, dateFrom, dateTo, studentId, academicYear, term },
      getSchoolId(req)
    );
    return { message: 'Student attendance records', attendances };
  });
};

exports.deleteStudentAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const { id } = req.params;
    if (!id) throw new Error('id is required');
    const deletedBy = getMarkedBy(req);
    const deletedRecord = await AttendanceModel.deleteStudentAttendance(id, deletedBy, getSchoolId(req));
    return { message: 'Record deleted', deletedRecord };
  });
};

exports.lockStudentAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const { className, attendanceDate } = req.body;
    if (!className || !attendanceDate) throw new Error('className and attendanceDate required');
    const lockedBy = getMarkedBy(req);
    const locked = await AttendanceModel.lockStudentAttendance({ className, attendanceDate }, lockedBy, getSchoolId(req));
    return { message: `Locked ${locked.length} student attendance records`, locked };
  });
};

exports.unlockStudentAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const { className, attendanceDate } = req.body;
    if (!className || !attendanceDate) throw new Error('className and attendanceDate required');
    const unlocked = await AttendanceModel.unlockStudentAttendance({ className, attendanceDate }, getSchoolId(req));
    return { message: `Unlocked ${unlocked.length} student attendance records`, unlocked };
  });
};

// ─── TEACHER-SCOPED STUDENT ATTENDANCE ─────────────────────
exports.getTeacherStudentsByClass = async (req, res) => {
  await handleRequest(res, async () => {
    const { className } = req.params;
    const teacherId = req.teacher?.teacherId || req.user?.id;
    if (!className) throw new Error('className is required');
    const students = await AttendanceModel.getTeacherStudentsByClass(teacherId, className, getSchoolId(req));
    return { message: 'Students retrieved', students };
  });
};

exports.markTeacherClassAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const schoolId = getSchoolId(req);
    const { className, attendanceDate, records } = req.body;
    const teacherId = req.teacher?.teacherId || req.user?.id;
    const markedBy = getMarkedBy(req);
    if (!className || !attendanceDate || !records || !records.length) throw new Error('Missing required fields');
    const isAssigned = await AttendanceModel.isTeacherAssignedToClass(teacherId, className, schoolId);
    if (!isAssigned) throw new Error('You are not authorized for this class');
    for (const record of records) {
      const { error } = studentAttendanceSchema.validate(record);
      if (error) throw new Error(`Invalid record for student ${record.studentId}: ${error.details[0].message}`);
    }
    const normalizedDate = normalizeDate(attendanceDate);
    const { academicYear, term } = await getCurrentAcademicYearAndTerm(new Date(normalizedDate));
    const result = await AttendanceModel.markClassAttendance(
      className, normalizedDate, markedBy, records, academicYear, term, schoolId
    );
    return { message: `Attendance marked for ${result.count} students`, result };
  });
};

exports.getTeacherStudentAttendances = async (req, res) => {
  await handleRequest(res, async () => {
    const { page = 1, limit = 50, className, dateFrom, dateTo } = req.query;
    const teacherId = req.teacher?.teacherId || req.user?.id;
    const attendances = await AttendanceModel.getTeacherStudentAttendances(
      { page: parseInt(page), limit: parseInt(limit), teacherId, className, dateFrom, dateTo },
      getSchoolId(req)
    );
    return { message: 'Student attendance records', attendances };
  });
};

// ─── TEACHER ATTENDANCE (ADMIN) ────────────────────────────
exports.getAllTeachersForAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const teachers = await AttendanceModel.getAllTeachersForAttendance(getSchoolId(req));
    return { message: 'Teachers retrieved', teachers };
  });
};

exports.getTeachersForDate = async (req, res) => {
  await handleRequest(res, async () => {
    const { date } = req.query;
    if (!date) throw new Error('Date is required');
    const teachers = await AttendanceModel.getTeachersForDate(date, getSchoolId(req));
    return { message: 'Teachers for date retrieved', teachers };
  });
};

exports.markTeachersAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const markedBy = getMarkedBy(req);
    const schoolId = getSchoolId(req);
    const { attendanceDate, records } = req.body;
    if (!attendanceDate || !records || !records.length) throw new Error('Missing required fields');
    const { error } = teacherBulkAttendanceSchema.validate({ attendanceDate, markedBy, records });
    if (error) throw new Error(error.details[0].message);
    const normalizedDate = normalizeDate(attendanceDate);
    const { academicYear, term } = await getCurrentAcademicYearAndTerm(new Date(normalizedDate));
    const result = await AttendanceModel.markTeachersAttendance(
      records, normalizedDate, markedBy, academicYear, term, schoolId
    );
    return { message: `Teacher attendance marked for ${result.count} teachers`, result };
  });
};

exports.markTeacherAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const markedBy = getMarkedBy(req);
    const schoolId = getSchoolId(req);
    const { teacherId, attendanceDate, status, reason } = req.body;
    if (!teacherId || !attendanceDate || !status) throw new Error('Missing required fields: teacherId, attendanceDate, status');
    const { error } = teacherAttendanceSchema.validate({ teacherId, status, reason });
    if (error) throw new Error(error.details[0].message);
    const normalizedDate = normalizeDate(attendanceDate);
    const { academicYear, term } = await getCurrentAcademicYearAndTerm(new Date(normalizedDate));
    const record = await AttendanceModel.markTeacherAttendance(
      teacherId, normalizedDate, status, reason, markedBy, academicYear, term, schoolId
    );
    return { message: 'Teacher attendance marked', record };
  });
};

exports.getTeacherAttendances = async (req, res) => {
  await handleRequest(res, async () => {
    const { page = 1, limit = 50, teacherId, dateFrom, dateTo, academicYear, term } = req.query;
    const attendances = await AttendanceModel.getAllTeacherAttendances(
      { page: parseInt(page), limit: parseInt(limit), teacherId, dateFrom, dateTo, academicYear, term },
      getSchoolId(req)
    );
    return { message: 'Teacher attendance records', attendances };
  });
};

exports.deleteTeacherAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const { id } = req.params;
    if (!id) throw new Error('id is required');
    const deletedBy = getMarkedBy(req);
    const deletedRecord = await AttendanceModel.deleteTeacherAttendance(id, deletedBy, getSchoolId(req));
    return { message: 'Record deleted', deletedRecord };
  });
};

exports.lockTeacherAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const { attendanceDate } = req.body;
    if (!attendanceDate) throw new Error('attendanceDate required');
    const lockedBy = getMarkedBy(req);
    const locked = await AttendanceModel.lockTeacherAttendance({ attendanceDate }, lockedBy, getSchoolId(req));
    return { message: `Locked ${locked.length} teacher attendance records`, locked };
  });
};

exports.unlockTeacherAttendance = async (req, res) => {
  await handleRequest(res, async () => {
    const { attendanceDate } = req.body;
    if (!attendanceDate) throw new Error('attendanceDate required');
    const unlocked = await AttendanceModel.unlockTeacherAttendance({ attendanceDate }, getSchoolId(req));
    return { message: `Unlocked ${unlocked.length} teacher attendance records`, unlocked };
  });
};

exports.getTeacherClassReports = async (req, res) => {
  await handleRequest(res, async () => {
    const teacherId = req.teacher?.teacherId || req.user?.id;
    const reports = await AttendanceModel.getTeacherClassReports(teacherId, getSchoolId(req));
    return { message: 'Reports retrieved', reports };
  });
};

// ─── EXPECTED DAYS ─────────────────────────────────────────
exports.setExpectedDays = async (req, res) => {
  await handleRequest(res, async () => {
    const { teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType } = req.body;
    const { error } = expectedDaysSchema.validate({ teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType });
    if (error) throw new Error(error.details[0].message);
    const expectedDay = await AttendanceModel.setExpectedDays(
      teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType, getSchoolId(req)
    );
    return { message: 'Expected day set', expectedDay };
  });
};

exports.setTeacherExpectedDays = async (req, res) => {
  await handleRequest(res, async () => {
    const { teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType } = req.body;
    const tokenTeacherId = req.teacher?.teacherId || req.user?.id;
    if (teacherId != tokenTeacherId) throw new Error('Teachers can only set their own expected days');
    const { error } = expectedDaysSchema.validate({ teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType });
    if (error) throw new Error(error.details[0].message);
    const expectedDay = await AttendanceModel.setExpectedDays(
      teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType, getSchoolId(req)
    );
    return { message: 'Expected day set', expectedDay };
  });
};

exports.setBulkExpectedDays = async (req, res) => {
  await handleRequest(res, async () => {
    const { teacherId, expectedDays } = req.body;
    const { error } = bulkExpectedDaysSchema.validate({ teacherId, expectedDays });
    if (error) throw new Error(error.details[0].message);
    const result = await AttendanceModel.setBulkExpectedDays(teacherId, expectedDays, getSchoolId(req));
    return { message: `Bulk expected days set for ${result.count} days`, result };
  });
};

exports.setTeacherBulkExpectedDays = async (req, res) => {
  await handleRequest(res, async () => {
    const { teacherId, expectedDays } = req.body;
    const tokenTeacherId = req.teacher?.teacherId || req.user?.id;
    if (teacherId != tokenTeacherId) throw new Error('Teachers can only set their own expected days');
    const { error } = bulkExpectedDaysSchema.validate({ teacherId, expectedDays });
    if (error) throw new Error(error.details[0].message);
    const result = await AttendanceModel.setBulkExpectedDays(teacherId, expectedDays, getSchoolId(req));
    return { message: `Bulk expected days set for ${result.count} days`, result };
  });
};

exports.getExpectedDaysByTeacher = async (req, res) => {
  await handleRequest(res, async () => {
    const { teacherId } = req.params;
    if (!teacherId) throw new Error('teacherId is required');
    const expectedDays = await AttendanceModel.getExpectedDaysByTeacher(teacherId, getSchoolId(req));
    return { message: 'Expected days retrieved', expectedDays };
  });
};

exports.getTeacherExpectedDays = async (req, res) => {
  await handleRequest(res, async () => {
    const { teacherId } = req.params;
    const tokenTeacherId = req.teacher?.teacherId || req.user?.id;
    if (teacherId != tokenTeacherId) throw new Error('Teachers can only access their own expected days');
    const expectedDays = await AttendanceModel.getExpectedDaysByTeacher(teacherId, getSchoolId(req));
    return { message: 'Expected days retrieved', expectedDays };
  });
};

exports.getAllTeachersWithExpectedDays = async (req, res) => {
  await handleRequest(res, async () => {
    const teachers = await AttendanceModel.getAllTeachersWithExpectedDays(getSchoolId(req));
    return { message: 'Teachers with expected days', teachers };
  });
};

exports.getExpectedDaysSummary = async (req, res) => {
  await handleRequest(res, async () => {
    const summary = await AttendanceModel.getExpectedDaysSummary(getSchoolId(req));
    return { message: 'Expected days summary', summary };
  });
};

exports.deleteExpectedDay = async (req, res) => {
  await handleRequest(res, async () => {
    const { id } = req.params;
    if (!id) throw new Error('id is required');
    const deletedRecord = await AttendanceModel.deleteExpectedDay(id, getSchoolId(req));
    return { message: 'Expected day deleted', deletedRecord };
  });
};

// ─── SUMMARIES ─────────────────────────────────────────────
exports.getMonthlyStudentSummary = async (req, res) => {
  await handleRequest(res, async () => {
    const { error } = monthlySummarySchema.validate(req.query);
    if (error) throw new Error(error.details[0].message);
    const { month, year } = req.query;
    const summary = await AttendanceModel.getMonthlyStudentSummary(month, year, getSchoolId(req));
    return { message: 'Monthly student summary', summary };
  });
};

exports.getMonthlyTeacherSummary = async (req, res) => {
  await handleRequest(res, async () => {
    const { error } = monthlySummarySchema.validate(req.query);
    if (error) throw new Error(error.details[0].message);
    const { month, year } = req.query;
    const summary = await AttendanceModel.getMonthlyTeacherSummary(month, year, getSchoolId(req));
    return { message: 'Monthly teacher summary', summary };
  });
};

exports.getStudentAbsenceReport = async (req, res) => {
  await handleRequest(res, async () => {
    const report = await AttendanceModel.getStudentAbsenceReport(getSchoolId(req));
    return { message: 'Student absence report', report };
  });
};

exports.getTeacherAbsenceReport = async (req, res) => {
  await handleRequest(res, async () => {
    const report = await AttendanceModel.getTeacherAbsenceReport(getSchoolId(req));
    return { message: 'Teacher absence report', report };
  });
};

exports.getDetailedTeacherAbsenceSummary = async (req, res) => {
  await handleRequest(res, async () => {
    const summary = await AttendanceModel.getDetailedTeacherAbsenceSummary(getSchoolId(req));
    return { message: 'Detailed teacher absence summary', summary };
  });
};

// ─── PDF EXPORT ────────────────────────────────────────────
exports.exportReportPdf = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { reportType, className, dateFrom, dateTo } = req.query;
    if (!reportType) return res.status(400).json({ error: 'reportType is required' });

    let rows = [], head = [], title = '';

    if (reportType === 'class') {
      if (!className) return res.status(400).json({ error: 'className is required' });
      const { records } = await AttendanceModel.getAllStudentAttendances(
        { className, dateFrom, dateTo, limit: 100000, page: 1 }, schoolId
      );
      const map = {};
      records.forEach((r) => {
        if (!map[r.student_id]) map[r.student_id] = { name: r.student_name, present: 0, absent: 0, excused: 0, total: 0 };
        const key = (r.status || '').toLowerCase();
        if (key === 'present') map[r.student_id].present++;
        else if (key === 'absent') map[r.student_id].absent++;
        else if (key === 'excused') map[r.student_id].excused++;
        map[r.student_id].total++;
      });
      rows = Object.values(map).map((s) => [
        s.name, String(s.present), String(s.absent), String(s.excused),
        s.total ? ((s.present / s.total) * 100).toFixed(1) + '%' : '0%'
      ]);
      head = ['Student', 'Present', 'Absent', 'Excused', 'Attendance %'];
      title = `Class Summary - ${className}`;
    } else if (reportType === 'student') {
      if (!className) return res.status(400).json({ error: 'className is required' });
      const { records } = await AttendanceModel.getAllStudentAttendances(
        { className, dateFrom, dateTo, limit: 100000, page: 1 }, schoolId
      );
      rows = records.map((r) => [
        r.student_name, r.class_name || className,
        r.attendance_date ? new Date(r.attendance_date).toLocaleDateString('en-GB') : 'N/A',
        r.status, r.reason || '-'
      ]);
      head = ['Student', 'Class', 'Date', 'Status', 'Reason'];
      title = `Student Details - ${className}`;
    } else if (reportType === 'teacher') {
      const { records } = await AttendanceModel.getAllTeacherAttendances(
        { dateFrom, dateTo, limit: 100000, page: 1 }, schoolId
      );
      rows = records.map((r) => [
        r.teacher_name,
        r.attendance_date ? new Date(r.attendance_date).toLocaleDateString('en-GB') : 'N/A',
        r.status, r.reason || '-'
      ]);
      head = ['Teacher', 'Date', 'Status', 'Reason'];
      title = 'Teacher Details';
    } else {
      return res.status(400).json({ error: 'Invalid reportType' });
    }

    const filename = `attendance-${reportType}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(16).fillColor('#000000').text('Attendance Report');
    doc.moveDown(0.2);
    doc.fontSize(12).fillColor('#333333').text(title);
    if (dateFrom || dateTo) doc.fontSize(9).fillColor('#666666').text(`Period: ${dateFrom || ''} → ${dateTo || ''}`.trim());
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`);
    doc.moveDown(1);

    const colCount = head.length;
    const tableWidth = 515;
    const colWidth = tableWidth / colCount;
    const startX = doc.x;
    const headerY = doc.y;
    let y = headerY;

    const drawRow = (cells, isHeader = false) => {
      doc.fontSize(9);
      if (isHeader) {
        doc.rect(startX, y, tableWidth, 20).fill('#000000');
        doc.fillColor('#FFFFFF');
      } else {
        doc.fillColor('#000000');
      }
      cells.forEach((cell, i) => {
        doc.text(String(cell), startX + i * colWidth + 4, y + 5, { width: colWidth - 8 });
      });
      doc.strokeColor('#000000').lineWidth(0.4).moveTo(startX, y + 20).lineTo(startX + tableWidth, y + 20).stroke();
      y += 20;
    };

    drawRow(head, true);
    rows.forEach((row) => {
      if (y > 760) { doc.addPage(); y = 40; drawRow(head, true); }
      drawRow(row);
    });

    const tableEndY = y;
    for (let i = 0; i <= colCount; i++) {
      const x = startX + i * colWidth;
      doc.strokeColor('#000000').lineWidth(0.4).moveTo(x, headerY).lineTo(x, tableEndY).stroke();
    }

    doc.end();
  } catch (err) {
    console.error('Error exporting report PDF:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate PDF report' });
  }
};

// ─── ARCHIVE ───────────────────────────────────────────────
exports.archiveAttendanceRecords = async (req, res) => {
  await handleRequest(res, async () => {
    const { academic_year } = req.params;
    const archivedBy = req.user?.username || req.body.archivedBy || 'system';
    if (!academic_year) throw new Error('academic_year is required');
    const result = await AttendanceModel.archiveAttendanceRecords(academic_year, archivedBy, getSchoolId(req));
    return { message: `Archived ${academic_year}`, result };
  });
};

exports.restoreArchiveBatch = async (req, res) => {
  await handleRequest(res, async () => {
    const { archive_batch_id } = req.params;
    const restoredBy = req.user?.username || req.body.restoredBy || 'system';
    if (!archive_batch_id) throw new Error('archive_batch_id is required');
    const result = await AttendanceModel.restoreArchivedRecords(archive_batch_id, restoredBy, getSchoolId(req));
    return { message: `Restored batch ${archive_batch_id}`, result };
  });
};

exports.getArchiveLogs = async (req, res) => {
  await handleRequest(res, async () => {
    const logs = await AttendanceModel.getArchiveLogs(getSchoolId(req));
    return { message: 'Archive logs', logs };
  });
};

exports.purgeArchiveBatch = async (req, res) => {
  await handleRequest(res, async () => {
    const { archive_batch_id } = req.params;
    if (!archive_batch_id) throw new Error('archive_batch_id is required');
    const result = await AttendanceModel.purgeArchiveBatch(archive_batch_id, getSchoolId(req));
    return { message: `Purged batch ${archive_batch_id}`, result };
  });
};

exports.purgeArchivesOlderThan = async (req, res) => {
  await handleRequest(res, async () => {
    const { olderThan } = req.body;
    if (!olderThan) throw new Error('olderThan date is required');
    const result = await AttendanceModel.purgeArchivesOlderThan(olderThan, getSchoolId(req));
    return { message: `Purged archives older than ${olderThan}`, result };
  });
};

exports.getCurrentAcademicYearStats = async (req, res) => {
  await handleRequest(res, async () => {
    const stats = await AttendanceModel.getCurrentAcademicYearStats(getSchoolId(req));
    return { message: 'Current academic year stats', stats };
  });
};

exports.getAttendanceStatsByAcademicYear = async (req, res) => {
  await handleRequest(res, async () => {
    const { academic_year } = req.params;
    if (!academic_year) throw new Error('academic_year is required');
    const stats = await AttendanceModel.getAttendanceStatsByAcademicYear(academic_year, getSchoolId(req));
    return { message: `Attendance stats for ${academic_year}`, stats };
  });
};