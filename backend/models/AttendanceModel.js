// backend/models/AttendanceModel.js
const db = require('../config/db');

const getClient = async () => db.getConnection();

// ─────────────────────────────────────────────────────────────
// DAY-OF-WEEK UTILITIES
// ─────────────────────────────────────────────────────────────

const getIsoDayOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
};

const DAY_MAP = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
const DAY_MAP_REVERSE = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };

const normalizeDayOfWeek = (input) => {
  if (typeof input === 'number') {
    if (input >= 1 && input <= 7) return input;
    throw new Error(`Invalid day number: ${input}`);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();
    if (DAY_MAP_REVERSE[lower]) return DAY_MAP_REVERSE[lower];
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= 7) return num;
    throw new Error(`Invalid day string: "${trimmed}"`);
  }
  throw new Error(`Invalid day type: ${typeof input}`);
};

// ─────────────────────────────────────────────────────────────
// STUDENT ATTENDANCE
// ─────────────────────────────────────────────────────────────

exports.getStudentsByClass = async (className, schoolId) => {
  const classResult = await db.tenantQuery(
    'SELECT id FROM classes WHERE LOWER(class_name) = LOWER($1) AND school_id = $2',
    [className, schoolId], schoolId
  );
  if (classResult.rows.length === 0) return [];
  const classId = classResult.rows[0].id;
  const result = await db.tenantQuery(
    `SELECT id, name AS full_name FROM students
     WHERE class_id = $1 AND school_id = $2 ORDER BY name`,
    [classId, schoolId], schoolId
  );
  return result.rows;
};

exports.markClassAttendance = async (className, attendanceDate, markedBy, records, academicYear, term, schoolId) => {
  const client = await getClient();
  const results = [];
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    for (const record of records) {
      const { studentId, status, reason } = record;

      const lockCheck = await client.query(
        `SELECT locked_at FROM student_attendances
         WHERE student_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
        [studentId, attendanceDate, schoolId]
      );
      if (lockCheck.rows.length > 0 && lockCheck.rows[0].locked_at) {
        throw new Error(`Student ${studentId} attendance is locked`);
      }

      const existing = await client.query(
        `SELECT id, status FROM student_attendances
         WHERE student_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
        [studentId, attendanceDate, schoolId]
      );
      const oldStatus = existing.rows[0]?.status || null;

      const result = await client.query(
        `INSERT INTO student_attendances
          (student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (student_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status, reason = EXCLUDED.reason, marked_by = EXCLUDED.marked_by,
           academic_year = EXCLUDED.academic_year, term = EXCLUDED.term,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, student_id, status, reason`,
        [studentId, className, attendanceDate, status, reason || null, markedBy, academicYear, term, schoolId]
      );
      const newRecord = result.rows[0];
      results.push(newRecord);

      if (oldStatus && oldStatus !== status) {
        await client.query(
          `INSERT INTO attendance_history
            (attendance_type, attendance_id, old_status, new_status, edited_by, reason, school_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['student', newRecord.id, oldStatus, status, markedBy, reason || null, schoolId]
        );
      }
      await client.query(
        `INSERT INTO attendance_logs (action, attendance_type, record_id, performed_by, details, school_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['UPSERT', 'student', newRecord.id, markedBy, JSON.stringify({ studentId, status, reason }), schoolId]
      );
    }

    await client.query('COMMIT');
    return { count: results.length, records: results };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.markSingleStudentAttendance = async (studentId, className, attendanceDate, status, reason, markedBy, academicYear, term, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const lockCheck = await client.query(
      `SELECT locked_at FROM student_attendances
       WHERE student_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
      [studentId, attendanceDate, schoolId]
    );
    if (lockCheck.rows.length > 0 && lockCheck.rows[0].locked_at) {
      throw new Error(`Attendance for student ${studentId} is locked`);
    }

    const existing = await client.query(
      `SELECT id, status FROM student_attendances
       WHERE student_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
      [studentId, attendanceDate, schoolId]
    );
    const oldStatus = existing.rows[0]?.status || null;

    const result = await client.query(
      `INSERT INTO student_attendances
        (student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (student_id, attendance_date)
       DO UPDATE SET
         status = EXCLUDED.status, reason = EXCLUDED.reason, marked_by = EXCLUDED.marked_by,
         academic_year = EXCLUDED.academic_year, term = EXCLUDED.term,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [studentId, className, attendanceDate, status, reason || null, markedBy, academicYear, term, schoolId]
    );
    const newRecord = result.rows[0];
    if (oldStatus && oldStatus !== status) {
      await client.query(
        `INSERT INTO attendance_history
          (attendance_type, attendance_id, old_status, new_status, edited_by, reason, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['student', newRecord.id, oldStatus, status, markedBy, reason || null, schoolId]
      );
    }
    await client.query(
      `INSERT INTO attendance_logs (action, attendance_type, record_id, performed_by, details, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['UPSERT', 'student', newRecord.id, markedBy, JSON.stringify({ studentId, status, reason }), schoolId]
    );
    await client.query('COMMIT');
    return newRecord;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getAllStudentAttendances = async (opts = {}, schoolId) => {
  const { page = 1, limit = 50, className, dateFrom, dateTo, studentId, academicYear, term } = opts;
  const offset = (page - 1) * limit;
  const conditions = ['sa.is_deleted = false', `sa.school_id = $1`];
  const params = [schoolId];
  let idx = 2;

  let query = `
    SELECT sa.*, s.name as student_name
    FROM student_attendances sa
    JOIN students s ON sa.student_id = s.id
  `;

  if (className) { conditions.push(`sa.class_name = $${idx++}`); params.push(className); }
  if (studentId) { conditions.push(`sa.student_id = $${idx++}`); params.push(studentId); }
  if (dateFrom) { conditions.push(`sa.attendance_date >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`sa.attendance_date <= $${idx++}`); params.push(dateTo); }
  if (academicYear) { conditions.push(`sa.academic_year = $${idx++}`); params.push(academicYear); }
  if (term) { conditions.push(`sa.term = $${idx++}`); params.push(term); }

  query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY sa.attendance_date DESC, sa.class_name, s.name LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const result = await db.tenantQuery(query, params, schoolId);

  const countConditions = conditions.slice();
  const countParams = params.slice(0, -2);
  const countQuery = `SELECT COUNT(*) FROM student_attendances sa WHERE ${countConditions.join(' AND ')}`;
  const countResult = await db.tenantQuery(countQuery, countParams, schoolId);
  const total = parseInt(countResult.rows[0].count);

  return {
    records: result.rows,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  };
};

exports.deleteStudentAttendance = async (id, deletedBy = 'system', schoolId) => {
  const lockCheck = await db.tenantQuery(
    `SELECT locked_at FROM student_attendances WHERE id = $1 AND is_deleted = false AND school_id = $2`,
    [id, schoolId], schoolId
  );
  if (lockCheck.rows.length > 0 && lockCheck.rows[0].locked_at) {
    throw new Error('Cannot delete locked attendance record');
  }

  const result = await db.tenantQuery(
    `UPDATE student_attendances
     SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
     WHERE id = $2 AND is_deleted = false AND school_id = $3
     RETURNING *`,
    [deletedBy, id, schoolId], schoolId
  );
  const deleted = result.rows[0];
  if (deleted) {
    await db.tenantQuery(
      `INSERT INTO attendance_logs (action, attendance_type, record_id, performed_by, details, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['DELETE', 'student', id, deletedBy, JSON.stringify({ student_id: deleted.student_id, date: deleted.attendance_date }), schoolId],
      schoolId
    );
  }
  return deleted;
};

exports.lockStudentAttendance = async (filters, lockedBy, schoolId) => {
  const { className, attendanceDate } = filters;
  if (!className || !attendanceDate) throw new Error('className and attendanceDate required');
  const result = await db.tenantQuery(
    `UPDATE student_attendances
     SET locked_at = CURRENT_TIMESTAMP, locked_by = $1
     WHERE class_name = $2 AND attendance_date = $3 AND is_deleted = false AND school_id = $4
     RETURNING *`,
    [lockedBy, className, attendanceDate, schoolId], schoolId
  );
  return result.rows;
};

exports.unlockStudentAttendance = async (filters, schoolId) => {
  const { className, attendanceDate } = filters;
  if (!className || !attendanceDate) throw new Error('className and attendanceDate required');
  const result = await db.tenantQuery(
    `UPDATE student_attendances
     SET locked_at = NULL, locked_by = NULL
     WHERE class_name = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3
     RETURNING *`,
    [className, attendanceDate, schoolId], schoolId
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────
// TEACHER ATTENDANCE
// ─────────────────────────────────────────────────────────────

exports.getAllTeachersForAttendance = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT id, full_name FROM teachers WHERE school_id = $1 ORDER BY full_name`,
    [schoolId], schoolId
  );
  return result.rows;
};

exports.getTeachersForDate = async (date, schoolId) => {
  const dayOfWeek = getIsoDayOfWeek(date);
  const result = await db.tenantQuery(
    `SELECT
       t.id, t.full_name,
       ed.is_full_day_expected,
       ed.expected_half_day_type,
       CASE
         WHEN ed.is_full_day_expected = true THEN 'Full Day'
         WHEN ed.expected_half_day_type = 'Morning' THEN 'Morning'
         WHEN ed.expected_half_day_type = 'Afternoon' THEN 'Afternoon'
         ELSE 'Off'
       END AS expected_type
     FROM teachers t
     INNER JOIN teacher_expected_days ed
       ON t.id = ed.teacher_id AND ed.day_of_week = $1
     WHERE ed.is_active = true AND t.school_id = $2 AND ed.school_id = $2
     ORDER BY t.full_name`,
    [dayOfWeek, schoolId], schoolId
  );
  return result.rows.filter(row => row.expected_type !== 'Off');
};

exports.markTeacherAttendance = async (teacherId, attendanceDate, status, reason, markedBy, academicYear, term, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const dayOfWeek = getIsoDayOfWeek(attendanceDate);
    const expectedRes = await client.query(
      `SELECT is_full_day_expected, expected_half_day_type
       FROM teacher_expected_days
       WHERE teacher_id = $1 AND day_of_week = $2 AND is_active = true AND school_id = $3`,
      [teacherId, dayOfWeek, schoolId]
    );
    if (expectedRes.rows.length === 0) throw new Error('Teacher is not scheduled for this day');
    const row = expectedRes.rows[0];
    const expectedType = row.is_full_day_expected ? 'Full Day' : row.expected_half_day_type;
    if (expectedType === 'Morning' && status === 'Afternoon') throw new Error('Teacher is expected only in the morning');
    if (expectedType === 'Afternoon' && status === 'Morning') throw new Error('Teacher is expected only in the afternoon');

    const lockCheck = await client.query(
      `SELECT locked_at FROM teacher_attendances
       WHERE teacher_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
      [teacherId, attendanceDate, schoolId]
    );
    if (lockCheck.rows.length > 0 && lockCheck.rows[0].locked_at) {
      throw new Error(`Teacher ${teacherId} attendance is locked`);
    }

    const existing = await client.query(
      `SELECT id, status FROM teacher_attendances
       WHERE teacher_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
      [teacherId, attendanceDate, schoolId]
    );
    const oldStatus = existing.rows[0]?.status || null;

    const result = await client.query(
      `INSERT INTO teacher_attendances
        (teacher_id, attendance_date, status, reason, marked_by, academic_year, term, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (teacher_id, attendance_date)
       DO UPDATE SET
         status = EXCLUDED.status, reason = EXCLUDED.reason, marked_by = EXCLUDED.marked_by,
         academic_year = EXCLUDED.academic_year, term = EXCLUDED.term,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [teacherId, attendanceDate, status, reason || null, markedBy, academicYear, term, schoolId]
    );
    const newRecord = result.rows[0];

    if (oldStatus && oldStatus !== status) {
      await client.query(
        `INSERT INTO attendance_history
          (attendance_type, attendance_id, old_status, new_status, edited_by, reason, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['teacher', newRecord.id, oldStatus, status, markedBy, reason || null, schoolId]
      );
    }
    await client.query(
      `INSERT INTO attendance_logs (action, attendance_type, record_id, performed_by, details, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['UPSERT', 'teacher', newRecord.id, markedBy, JSON.stringify({ teacherId, status, reason }), schoolId]
    );
    await client.query('COMMIT');
    return newRecord;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.markTeachersAttendance = async (records, attendanceDate, markedBy, academicYear, term, schoolId) => {
  const client = await getClient();
  const results = [];
  const skipped = [];
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);
    const dayOfWeek = getIsoDayOfWeek(attendanceDate);

    for (const rec of records) {
      const { teacherId, status, reason } = rec;

      const expectedRes = await client.query(
        `SELECT is_full_day_expected, expected_half_day_type
         FROM teacher_expected_days
         WHERE teacher_id = $1 AND day_of_week = $2 AND is_active = true AND school_id = $3`,
        [teacherId, dayOfWeek, schoolId]
      );
      if (expectedRes.rows.length === 0) { skipped.push({ teacherId, reason: 'Not scheduled for this day' }); continue; }
      const row = expectedRes.rows[0];
      const expectedType = row.is_full_day_expected ? 'Full Day' : row.expected_half_day_type;
      if (expectedType === 'Morning' && status === 'Afternoon') { skipped.push({ teacherId, reason: 'Expected only in the morning' }); continue; }
      if (expectedType === 'Afternoon' && status === 'Morning') { skipped.push({ teacherId, reason: 'Expected only in the afternoon' }); continue; }

      const lockCheck = await client.query(
        `SELECT locked_at FROM teacher_attendances
         WHERE teacher_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
        [teacherId, attendanceDate, schoolId]
      );
      if (lockCheck.rows.length > 0 && lockCheck.rows[0].locked_at) { skipped.push({ teacherId, reason: 'Record is locked' }); continue; }

      const existing = await client.query(
        `SELECT id, status FROM teacher_attendances
         WHERE teacher_id = $1 AND attendance_date = $2 AND is_deleted = false AND school_id = $3`,
        [teacherId, attendanceDate, schoolId]
      );
      const oldStatus = existing.rows[0]?.status || null;

      const result = await client.query(
        `INSERT INTO teacher_attendances
          (teacher_id, attendance_date, status, reason, marked_by, academic_year, term, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (teacher_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status, reason = EXCLUDED.reason, marked_by = EXCLUDED.marked_by,
           academic_year = EXCLUDED.academic_year, term = EXCLUDED.term,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, teacher_id, status, reason`,
        [teacherId, attendanceDate, status, reason || null, markedBy, academicYear, term, schoolId]
      );
      const newRecord = result.rows[0];
      results.push(newRecord);
      if (oldStatus && oldStatus !== status) {
        await client.query(
          `INSERT INTO attendance_history
            (attendance_type, attendance_id, old_status, new_status, edited_by, reason, school_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['teacher', newRecord.id, oldStatus, status, markedBy, reason || null, schoolId]
        );
      }
      await client.query(
        `INSERT INTO attendance_logs (action, attendance_type, record_id, performed_by, details, school_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['UPSERT', 'teacher', newRecord.id, markedBy, JSON.stringify({ teacherId, status, reason }), schoolId]
      );
    }
    await client.query('COMMIT');
    return { count: results.length, records: results, skipped };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getAllTeacherAttendances = async (opts = {}, schoolId) => {
  const { page = 1, limit = 50, teacherId, dateFrom, dateTo, academicYear, term } = opts;
  const offset = (page - 1) * limit;
  const conditions = ['ta.is_deleted = false', `ta.school_id = $1`];
  const params = [schoolId];
  let idx = 2;

  let query = `
    SELECT ta.*, t.full_name as teacher_name
    FROM teacher_attendances ta
    LEFT JOIN teachers t ON ta.teacher_id = t.id
  `;

  if (teacherId) { conditions.push(`ta.teacher_id = $${idx++}`); params.push(teacherId); }
  if (dateFrom) { conditions.push(`ta.attendance_date >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`ta.attendance_date <= $${idx++}`); params.push(dateTo); }
  if (academicYear) { conditions.push(`ta.academic_year = $${idx++}`); params.push(academicYear); }
  if (term) { conditions.push(`ta.term = $${idx++}`); params.push(term); }

  query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY ta.attendance_date DESC, t.full_name LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const result = await db.tenantQuery(query, params, schoolId);

  const countParams = params.slice(0, -2);
  const countQuery = `SELECT COUNT(*) FROM teacher_attendances ta WHERE ${conditions.join(' AND ')}`;
  const countResult = await db.tenantQuery(countQuery, countParams, schoolId);
  const total = parseInt(countResult.rows[0].count);

  return {
    records: result.rows,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  };
};

exports.deleteTeacherAttendance = async (id, deletedBy = 'system', schoolId) => {
  const lockCheck = await db.tenantQuery(
    `SELECT locked_at FROM teacher_attendances WHERE id = $1 AND is_deleted = false AND school_id = $2`,
    [id, schoolId], schoolId
  );
  if (lockCheck.rows.length > 0 && lockCheck.rows[0].locked_at) {
    throw new Error('Cannot delete locked attendance record');
  }

  const result = await db.tenantQuery(
    `UPDATE teacher_attendances
     SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
     WHERE id = $2 AND is_deleted = false AND school_id = $3
     RETURNING *`,
    [deletedBy, id, schoolId], schoolId
  );
  const deleted = result.rows[0];
  if (deleted) {
    await db.tenantQuery(
      `INSERT INTO attendance_logs (action, attendance_type, record_id, performed_by, details, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['DELETE', 'teacher', id, deletedBy, JSON.stringify({ teacher_id: deleted.teacher_id, date: deleted.attendance_date }), schoolId],
      schoolId
    );
  }
  return deleted;
};

exports.lockTeacherAttendance = async (filters, lockedBy, schoolId) => {
  const { attendanceDate } = filters;
  if (!attendanceDate) throw new Error('attendanceDate required');
  const result = await db.tenantQuery(
    `UPDATE teacher_attendances
     SET locked_at = CURRENT_TIMESTAMP, locked_by = $1
     WHERE attendance_date = $2 AND is_deleted = false AND school_id = $3
     RETURNING *`,
    [lockedBy, attendanceDate, schoolId], schoolId
  );
  return result.rows;
};

exports.unlockTeacherAttendance = async (filters, schoolId) => {
  const { attendanceDate } = filters;
  if (!attendanceDate) throw new Error('attendanceDate required');
  const result = await db.tenantQuery(
    `UPDATE teacher_attendances
     SET locked_at = NULL, locked_by = NULL
     WHERE attendance_date = $1 AND is_deleted = false AND school_id = $2
     RETURNING *`,
    [attendanceDate, schoolId], schoolId
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────
// TEACHER STUDENT ATTENDANCE
// ─────────────────────────────────────────────────────────────

exports.getTeacherStudentsByClass = async (teacherId, className, schoolId) => {
  const classResult = await db.tenantQuery(
    'SELECT id FROM classes WHERE class_name = $1 AND school_id = $2',
    [className, schoolId], schoolId
  );
  if (classResult.rows.length === 0) return [];
  const classId = classResult.rows[0].id;
  const result = await db.tenantQuery(
    `SELECT s.id, s.name as full_name
     FROM students s
     JOIN teacher_assignments ta ON s.class_id = ta.class_id
     WHERE ta.teacher_id = $1 AND ta.class_id = $2 AND s.school_id = $3`,
    [teacherId, classId, schoolId], schoolId
  );
  return result.rows;
};

exports.isTeacherAssignedToClass = async (teacherId, className, schoolId) => {
  const classResult = await db.tenantQuery(
    'SELECT id FROM classes WHERE class_name = $1 AND school_id = $2',
    [className, schoolId], schoolId
  );
  if (classResult.rows.length === 0) return false;
  const classId = classResult.rows[0].id;
  const result = await db.tenantQuery(
    `SELECT 1 FROM teacher_assignments
     WHERE teacher_id = $1 AND class_id = $2 AND school_id = $3`,
    [teacherId, classId, schoolId], schoolId
  );
  return result.rows.length > 0;
};

exports.getTeacherStudentAttendances = async (opts, schoolId) => {
  const { teacherId, page = 1, limit = 50, className, dateFrom, dateTo } = opts;
  const offset = (page - 1) * limit;

  const assignedClasses = await db.tenantQuery(
    'SELECT class_id FROM teacher_assignments WHERE teacher_id = $1 AND school_id = $2',
    [teacherId, schoolId], schoolId
  );
  const classIds = assignedClasses.rows.map(row => row.class_id);

  if (classIds.length === 0) {
    return { records: [], pagination: { page, limit, total: 0 } };
  }

  const conditions = ['sa.is_deleted = false', `sa.school_id = $2`];
  const params = [classIds, schoolId];
  let idx = 3;

  let query = `
    SELECT sa.*, s.name as student_name
    FROM student_attendances sa
    JOIN students s ON sa.student_id = s.id
    WHERE s.class_id = ANY($1)
  `;

  if (className) {
    const classResult = await db.tenantQuery(
      'SELECT id FROM classes WHERE class_name = $1 AND school_id = $2',
      [className, schoolId], schoolId
    );
    if (classResult.rows.length > 0) {
      conditions.push(`s.class_id = $${idx++}`);
      params.push(classResult.rows[0].id);
    }
  }
  if (dateFrom) { conditions.push(`sa.attendance_date >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`sa.attendance_date <= $${idx++}`); params.push(dateTo); }

  query += ` AND ${conditions.join(' AND ')}`;
  query += ` ORDER BY sa.attendance_date DESC, s.name LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const result = await db.tenantQuery(query, params, schoolId);
  return {
    records: result.rows,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: result.rows.length }
  };
};

exports.getTeacherClassReports = async (teacherId, schoolId) => {
  const assignedClasses = await db.tenantQuery(
    'SELECT class_id FROM teacher_assignments WHERE teacher_id = $1 AND school_id = $2',
    [teacherId, schoolId], schoolId
  );
  const classIds = assignedClasses.rows.map(row => row.class_id);
  if (classIds.length === 0) return [];
  const result = await db.tenantQuery(
    `SELECT
      s.class_name,
      COUNT(*) as total_records,
      SUM(CASE WHEN sa.status = 'Present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN sa.status = 'Absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN sa.status = 'Excused' THEN 1 ELSE 0 END) as excused,
      SUM(CASE WHEN sa.status = 'Late' THEN 1 ELSE 0 END) as late,
      ROUND(SUM(CASE WHEN sa.status = 'Present' THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*),0) * 100, 2) as attendance_percentage
    FROM student_attendances sa
    JOIN students s ON sa.student_id = s.id
    WHERE s.class_id = ANY($1) AND sa.is_deleted = false AND sa.school_id = $2
    GROUP BY s.class_name
    ORDER BY s.class_name`,
    [classIds, schoolId], schoolId
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────
// EXPECTED DAYS
// ─────────────────────────────────────────────────────────────

exports.setExpectedDays = async (teacherId, dayOfWeekInput, isFullDayExpected, expectedHalfDayType, schoolId) => {
  const dayInt = normalizeDayOfWeek(dayOfWeekInput);
  const result = await db.tenantQuery(
    `INSERT INTO teacher_expected_days
      (teacher_id, day_of_week, is_full_day_expected, expected_half_day_type, is_active, school_id)
     VALUES ($1, $2, $3, $4, true, $5)
     ON CONFLICT (school_id, teacher_id, day_of_week)
     DO UPDATE SET
       is_full_day_expected = EXCLUDED.is_full_day_expected,
       expected_half_day_type = EXCLUDED.expected_half_day_type,
       is_active = true,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [teacherId, dayInt, isFullDayExpected, expectedHalfDayType, schoolId], schoolId
  );
  return result.rows[0];
};

exports.setBulkExpectedDays = async (teacherId, expectedDays, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);
    await client.query(
      'UPDATE teacher_expected_days SET is_active = false WHERE teacher_id = $1 AND school_id = $2',
      [teacherId, schoolId]
    );
    const results = [];
    for (const day of expectedDays) {
      const dayInt = normalizeDayOfWeek(day.dayOfWeek);
      const result = await client.query(
        `INSERT INTO teacher_expected_days
          (teacher_id, day_of_week, is_full_day_expected, expected_half_day_type, is_active, school_id)
         VALUES ($1, $2, $3, $4, true, $5)
         ON CONFLICT (school_id, teacher_id, day_of_week)
         DO UPDATE SET
           is_full_day_expected = EXCLUDED.is_full_day_expected,
           expected_half_day_type = EXCLUDED.expected_half_day_type,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [teacherId, dayInt, day.isFullDayExpected, day.expectedHalfDayType || null, schoolId]
      );
      results.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return { count: results.length, records: results };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getExpectedDaysByTeacher = async (teacherId, schoolId) => {
  const result = await db.tenantQuery(
    `SELECT * FROM teacher_expected_days
     WHERE teacher_id = $1 AND is_active = true AND school_id = $2
     ORDER BY day_of_week`,
    [teacherId, schoolId], schoolId
  );
  return result.rows.map(r => ({ ...r, day_of_week: DAY_MAP[r.day_of_week] }));
};

exports.getAllTeachersWithExpectedDays = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT
      t.id as teacher_id, t.full_name,
      ed.day_of_week, ed.is_full_day_expected, ed.expected_half_day_type,
      ed.created_at, ed.updated_at, ed.is_active
    FROM teachers t
    LEFT JOIN teacher_expected_days ed ON t.id = ed.teacher_id AND ed.is_active = true
    WHERE t.school_id = $1
    ORDER BY t.full_name, ed.day_of_week`,
    [schoolId], schoolId
  );
  return result.rows.map(r => ({ ...r, day_of_week: r.day_of_week ? DAY_MAP[r.day_of_week] : null }));
};

exports.deleteExpectedDay = async (id, schoolId) => {
  const result = await db.tenantQuery(
    `UPDATE teacher_expected_days SET is_active = false
     WHERE id = $1 AND school_id = $2 RETURNING *`,
    [id, schoolId], schoolId
  );
  return result.rows[0];
};

exports.getExpectedDaysSummary = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT
      t.id as teacher_id, t.full_name,
      COUNT(ed.day_of_week) as total_expected_days,
      COUNT(CASE WHEN ed.is_full_day_expected = true THEN 1 END) as full_days_expected,
      COUNT(CASE WHEN ed.is_full_day_expected = false THEN 1 END) as half_days_expected
    FROM teachers t
    LEFT JOIN teacher_expected_days ed ON t.id = ed.teacher_id AND ed.is_active = true
    WHERE t.school_id = $1
    GROUP BY t.id, t.full_name
    ORDER BY t.full_name`,
    [schoolId], schoolId
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD & SUMMARIES
// ─────────────────────────────────────────────────────────────

exports.getAttendanceStats = async (dateFrom, dateTo, schoolId) => {
  const studentStats = await db.tenantQuery(
    `SELECT
      COUNT(*) as total_student_records,
      SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as student_present,
      SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as student_absent,
      SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as student_late,
      SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as student_excused
    FROM student_attendances
    WHERE attendance_date BETWEEN $1 AND $2 AND is_deleted = false AND school_id = $3`,
    [dateFrom, dateTo, schoolId], schoolId
  );
  const teacherStats = await db.tenantQuery(
    `SELECT
      COUNT(*) as total_teacher_records,
      SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as teacher_present,
      SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as teacher_absent,
      SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as teacher_late,
      SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as teacher_excused
    FROM teacher_attendances
    WHERE attendance_date BETWEEN $1 AND $2 AND is_deleted = false AND school_id = $3`,
    [dateFrom, dateTo, schoolId], schoolId
  );
  return { students: studentStats.rows[0], teachers: teacherStats.rows[0] };
};

exports.getMonthlyStudentSummary = async (month, year, schoolId) => {
  const result = await db.tenantQuery(
    `SELECT
      class_name,
      COUNT(*) AS total_records,
      SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_days,
      SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
      SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_days,
      SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) AS excused_days,
      ROUND(SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*),0) * 100, 2) AS attendance_percentage
    FROM student_attendances
    WHERE EXTRACT(MONTH FROM attendance_date) = $1 AND EXTRACT(YEAR FROM attendance_date) = $2
      AND is_deleted = false AND school_id = $3
    GROUP BY class_name ORDER BY class_name`,
    [month, year, schoolId], schoolId
  );
  return result.rows;
};

exports.getMonthlyTeacherSummary = async (month, year, schoolId) => {
  const result = await db.tenantQuery(
    `SELECT
      t.full_name AS teacher_name, t.id as teacher_id,
      COUNT(*) AS total_records,
      SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_days,
      SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
      SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_days,
      SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) AS excused_days,
      ROUND(SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*),0) * 100, 2) AS attendance_percentage
    FROM teacher_attendances ta
    JOIN teachers t ON ta.teacher_id = t.id
    WHERE EXTRACT(MONTH FROM attendance_date) = $1 AND EXTRACT(YEAR FROM attendance_date) = $2
      AND ta.is_deleted = false AND ta.school_id = $3
    GROUP BY t.id, t.full_name ORDER BY t.full_name`,
    [month, year, schoolId], schoolId
  );
  return result.rows;
};

exports.getStudentAbsenceReport = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT s.id as student_id, s.name as full_name, sa.attendance_date, sa.status, sa.reason
     FROM student_attendances sa JOIN students s ON sa.student_id = s.id
     WHERE sa.status <> 'Present' AND sa.is_deleted = false AND sa.school_id = $1
     ORDER BY sa.attendance_date DESC`,
    [schoolId], schoolId
  );
  return result.rows;
};

exports.getTeacherAbsenceReport = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT t.id as teacher_id, t.full_name, ta.attendance_date, ta.status, ta.reason
     FROM teacher_attendances ta JOIN teachers t ON ta.teacher_id = t.id
     WHERE ta.status <> 'Present' AND ta.is_deleted = false AND ta.school_id = $1
     ORDER BY ta.attendance_date DESC`,
    [schoolId], schoolId
  );
  return result.rows;
};

exports.getDetailedTeacherAbsenceSummary = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT t.id as teacher_id, t.full_name,
      COUNT(*) FILTER (WHERE ta.status = 'Absent') as total_absent,
      COUNT(*) FILTER (WHERE ta.status = 'Excused') as total_excused,
      COUNT(*) FILTER (WHERE ta.status = 'Late') as total_late,
      COUNT(*) FILTER (WHERE ta.status = 'Present') as total_present
    FROM teacher_attendances ta JOIN teachers t ON ta.teacher_id = t.id
    WHERE ta.is_deleted = false AND ta.school_id = $1
    GROUP BY t.id, t.full_name ORDER BY total_absent DESC`,
    [schoolId], schoolId
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────
// ARCHIVE & STATS
// ─────────────────────────────────────────────────────────────

exports.archiveAttendanceRecords = async (academic_year, archivedBy, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const batchRes = await client.query(`SELECT gen_random_uuid() as batch_id`);
    const archiveBatchId = batchRes.rows[0].batch_id;

    const studentCheck = await client.query(
      `SELECT COUNT(*) FROM student_attendances WHERE academic_year = $1 AND is_deleted = false AND school_id = $2`,
      [academic_year, schoolId]
    );
    const teacherCheck = await client.query(
      `SELECT COUNT(*) FROM teacher_attendances WHERE academic_year = $1 AND is_deleted = false AND school_id = $2`,
      [academic_year, schoolId]
    );
    const studentCount = parseInt(studentCheck.rows[0].count);
    const teacherCount = parseInt(teacherCheck.rows[0].count);
    if (studentCount === 0 && teacherCount === 0) throw new Error(`No attendance records found for academic year ${academic_year}`);

    if (studentCount > 0) {
      await client.query(
        `INSERT INTO archived_student_attendances
          (archive_batch_id, student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term, archived_by, school_id)
         SELECT $1, student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term, $3, $4
         FROM student_attendances WHERE academic_year = $2 AND is_deleted = false AND school_id = $4`,
        [archiveBatchId, academic_year, archivedBy, schoolId]
      );
    }
    if (teacherCount > 0) {
      await client.query(
        `INSERT INTO archived_teacher_attendances
          (archive_batch_id, teacher_id, attendance_date, status, reason, marked_by, academic_year, term, archived_by, school_id)
         SELECT $1, teacher_id, attendance_date, status, reason, marked_by, academic_year, term, $3, $4
         FROM teacher_attendances WHERE academic_year = $2 AND is_deleted = false AND school_id = $4`,
        [archiveBatchId, academic_year, archivedBy, schoolId]
      );
    }
    if (studentCount > 0) {
      await client.query(
        `DELETE FROM student_attendances WHERE academic_year = $1 AND is_deleted = false AND school_id = $2`,
        [academic_year, schoolId]
      );
    }
    if (teacherCount > 0) {
      await client.query(
        `DELETE FROM teacher_attendances WHERE academic_year = $1 AND is_deleted = false AND school_id = $2`,
        [academic_year, schoolId]
      );
    }

    await client.query(
      `INSERT INTO attendance_archive_logs
        (archive_batch_id, academic_year, archived_by, student_count, teacher_count, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [archiveBatchId, academic_year, archivedBy, studentCount, teacherCount, schoolId]
    );
    await client.query('COMMIT');
    return { archiveBatchId, studentCount, teacherCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.restoreArchivedRecords = async (archiveBatchId, restoredBy, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const batchCheck = await client.query(
      'SELECT * FROM attendance_archive_logs WHERE archive_batch_id = $1 AND school_id = $2',
      [archiveBatchId, schoolId]
    );
    if (batchCheck.rows.length === 0) throw new Error(`Archive batch ${archiveBatchId} not found`);

    await client.query(
      `INSERT INTO student_attendances
        (student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term, school_id)
       SELECT student_id, class_name, attendance_date, status, reason, marked_by, academic_year, term, school_id
       FROM archived_student_attendances WHERE archive_batch_id = $1
       ON CONFLICT (student_id, attendance_date)
       DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, marked_by = EXCLUDED.marked_by,
         academic_year = EXCLUDED.academic_year, term = EXCLUDED.term`,
      [archiveBatchId]
    );

    await client.query(
      `INSERT INTO teacher_attendances
        (teacher_id, attendance_date, status, reason, marked_by, academic_year, term, school_id)
       SELECT teacher_id, attendance_date, status, reason, marked_by, academic_year, term, school_id
       FROM archived_teacher_attendances WHERE archive_batch_id = $1
       ON CONFLICT (teacher_id, attendance_date)
       DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, marked_by = EXCLUDED.marked_by,
         academic_year = EXCLUDED.academic_year, term = EXCLUDED.term`,
      [archiveBatchId]
    );

    await client.query('DELETE FROM archived_student_attendances WHERE archive_batch_id = $1', [archiveBatchId]);
    await client.query('DELETE FROM archived_teacher_attendances WHERE archive_batch_id = $1', [archiveBatchId]);
    await client.query('DELETE FROM attendance_archive_logs WHERE archive_batch_id = $1', [archiveBatchId]);
    await client.query('COMMIT');
    return { restoredStudents: 0, restoredTeachers: 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getArchiveLogs = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT archive_batch_id, academic_year, archived_by, archived_at, student_count, teacher_count
     FROM attendance_archive_logs WHERE school_id = $1 ORDER BY archived_at DESC`,
    [schoolId], schoolId
  );
  return result.rows;
};

exports.purgeArchiveBatch = async (archiveBatchId, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);
    const delStudents = await client.query(
      'DELETE FROM archived_student_attendances WHERE archive_batch_id = $1 AND school_id = $2',
      [archiveBatchId, schoolId]
    );
    const delTeachers = await client.query(
      'DELETE FROM archived_teacher_attendances WHERE archive_batch_id = $1 AND school_id = $2',
      [archiveBatchId, schoolId]
    );
    const delLog = await client.query(
      'DELETE FROM attendance_archive_logs WHERE archive_batch_id = $1 AND school_id = $2',
      [archiveBatchId, schoolId]
    );
    await client.query('COMMIT');
    return { deletedStudentRows: delStudents.rowCount, deletedTeacherRows: delTeachers.rowCount, deletedLogRows: delLog.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.purgeArchivesOlderThan = async (olderThanIsoDate, schoolId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(schoolId)]);

    const batchesRes = await client.query(
      'SELECT archive_batch_id FROM attendance_archive_logs WHERE archived_at < $1 AND school_id = $2',
      [olderThanIsoDate, schoolId]
    );
    const batchIds = batchesRes.rows.map(r => r.archive_batch_id);
    if (batchIds.length === 0) return { deletedStudentRows: 0, deletedTeacherRows: 0, deletedLogRows: 0, purgedBatches: 0 };

    const placeholders = batchIds.map((_, i) => `$${i + 1}`).join(',');
    const delStudents = await client.query(
      `DELETE FROM archived_student_attendances WHERE archive_batch_id IN (${placeholders})`, batchIds
    );
    const delTeachers = await client.query(
      `DELETE FROM archived_teacher_attendances WHERE archive_batch_id IN (${placeholders})`, batchIds
    );
    const delLog = await client.query(
      `DELETE FROM attendance_archive_logs WHERE archive_batch_id IN (${placeholders})`, batchIds
    );
    await client.query('COMMIT');
    return { deletedStudentRows: delStudents.rowCount, deletedTeacherRows: delTeachers.rowCount, deletedLogRows: delLog.rowCount, purgedBatches: batchIds.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getCurrentAcademicYearStats = async (schoolId) => {
  const result = await db.tenantQuery(
    `SELECT academic_year,
      COUNT(*) FILTER (WHERE status = 'Present') as present_count,
      COUNT(*) FILTER (WHERE status = 'Absent') as absent_count,
      COUNT(*) as total_records
    FROM (
      SELECT academic_year, status FROM student_attendances WHERE is_deleted = false AND school_id = $1
      UNION ALL
      SELECT academic_year, status FROM teacher_attendances WHERE is_deleted = false AND school_id = $1
    ) t
    GROUP BY academic_year ORDER BY academic_year DESC LIMIT 1`,
    [schoolId], schoolId
  );
  return result.rows[0] || {};
};

exports.getAttendanceStatsByAcademicYear = async (academic_year, schoolId) => {
  const result = await db.tenantQuery(
    `SELECT 'students' as type,
      COUNT(*) FILTER (WHERE status = 'Present') as present_count,
      COUNT(*) FILTER (WHERE status = 'Absent') as absent_count,
      COUNT(*) as total_records
    FROM student_attendances WHERE academic_year = $1 AND is_deleted = false AND school_id = $2
    UNION ALL
    SELECT 'teachers' as type,
      COUNT(*) FILTER (WHERE status = 'Present') as present_count,
      COUNT(*) FILTER (WHERE status = 'Absent') as absent_count,
      COUNT(*) as total_records
    FROM teacher_attendances WHERE academic_year = $1 AND is_deleted = false AND school_id = $2`,
    [academic_year, schoolId], schoolId
  );
  return result.rows;
};