// backend/models/studentTermReportModel.js
const db = require("../config/db");

const StudentTermReportModel = {
  upsert: async ({ student_id, academic_year, term, class_teacher_comment, attendance_present, attendance_absent, conduct }, schoolId) => {
    const { rows } = await db.tenantQuery(
      `INSERT INTO student_term_reports
        (student_id, academic_year, term, class_teacher_comment,
         attendance_present, attendance_absent, conduct, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (school_id, student_id, academic_year, term) DO UPDATE SET
         class_teacher_comment = EXCLUDED.class_teacher_comment,
         attendance_present = EXCLUDED.attendance_present,
         attendance_absent = EXCLUDED.attendance_absent,
         conduct = EXCLUDED.conduct
       RETURNING *`,
      [student_id, academic_year, term, class_teacher_comment, attendance_present, attendance_absent, conduct, schoolId],
      schoolId
    );
    return rows[0];
  },

  getByStudent: async (student_id, academic_year, term, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT * FROM student_term_reports
       WHERE student_id = $1 AND academic_year = $2 AND term = $3 AND school_id = $4`,
      [student_id, academic_year, term, schoolId],
      schoolId
    );
    return rows[0] || null;
  },
};

module.exports = StudentTermReportModel;