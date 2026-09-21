// backend/models/markModel.js
const db = require("../config/db");

const MarkModel = {
  // ─── UPSERT (now accepts is_exempt) ─────────────────────
  upsert: async (
    { student_id, subject_id, teacher_id, evaluation_type, score, is_exempt = false },
    schoolId
  ) => {
    const result = await db.tenantQuery(
      `INSERT INTO marks
        (student_id, subject_id, teacher_id, evaluation_type, score, is_exempt, submission_date, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       ON CONFLICT (student_id, subject_id, evaluation_type)
       DO UPDATE SET
          score = EXCLUDED.score,
          is_exempt = EXCLUDED.is_exempt,
          teacher_id = EXCLUDED.teacher_id,
          submission_date = NOW()
       RETURNING *`,
      [student_id, subject_id, teacher_id, evaluation_type, score, is_exempt, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  // ─── GET MARKS FOR ONE EVALUATION ───────────────────────
  getMarksByEvaluation: async (teacher_id, subject_id, class_id, evaluation_type, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT m.*, st.name AS student_name
       FROM marks m
       JOIN students st ON m.student_id = st.id
       WHERE m.teacher_id = $1
         AND m.subject_id = $2
         AND st.class_id = $3
         AND m.evaluation_type = $4
         AND m.school_id = $5
       ORDER BY st.name ASC`,
      [teacher_id, subject_id, class_id, evaluation_type, schoolId],
      schoolId
    );
    return result.rows;
  },

  // ─── GET MARKS FOR MULTIPLE EVALUATIONS (term) ─────────
  getMarksByEvaluationTypes: async (teacher_id, subject_id, class_id, evaluationTypes, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT m.*, st.name as student_name
       FROM marks m
       JOIN students st ON m.student_id = st.id
       WHERE m.teacher_id = $1
         AND m.subject_id = $2
         AND st.class_id = $3
         AND m.evaluation_type = ANY($4)
         AND m.school_id = $5
       ORDER BY st.name, m.evaluation_type`,
      [teacher_id, subject_id, class_id, evaluationTypes, schoolId],
      schoolId
    );
    return result.rows;
  },

  // ─── GET ALL MARKS FOR ONE STUDENT ──────────────────────
  getStudentMarks: async (student_id, schoolId, subject_id = null) => {
    const query = `
      SELECT m.*, s.name AS subject_name, s.coefficient
      FROM marks m
      JOIN subjects s ON m.subject_id = s.id
      WHERE m.student_id = $1 AND m.school_id = $2
      ${subject_id ? 'AND m.subject_id = $3' : ''}
      ORDER BY m.evaluation_type
    `;
    const params = subject_id ? [student_id, schoolId, subject_id] : [student_id, schoolId];
    const result = await db.tenantQuery(query, params, schoolId);
    return result.rows;
  },

  // ─── TEACHER ASSIGNMENT CHECK ───────────────────────────
  isTeacherAssigned: async (teacher_id, subject_id, class_id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT 1 FROM teacher_assignments
       WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3 AND school_id = $4`,
      [teacher_id, subject_id, class_id, schoolId],
      schoolId
    );
    return result.rows.length > 0;
  },

  // ─── GET STUDENTS BY CLASS ──────────────────────────────
  getStudentsByClass: async (class_id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT id, name FROM students
       WHERE class_id = $1 AND school_id = $2
       ORDER BY name ASC`,
      [class_id, schoolId],
      schoolId
    );
    return result.rows;
  },

  // ─── DELETE SINGLE MARK ─────────────────────────────────
  deleteMark: async (id, teacher_id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM marks
       WHERE id = $1 AND teacher_id = $2 AND school_id = $3
       RETURNING *`,
      [id, teacher_id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  // ─── GET ALL MARKS FOR A CLASS ──────────────────────────
  getClassMarks: async (class_id, schoolId, evaluation_type = null) => {
    const query = `
      SELECT m.*, s.name AS student_name, sub.name AS subject_name
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE s.class_id = $1 AND m.school_id = $2
      ${evaluation_type ? 'AND m.evaluation_type = $3' : ''}
      ORDER BY s.name, m.evaluation_type
    `;
    const params = evaluation_type ? [class_id, schoolId, evaluation_type] : [class_id, schoolId];
    const result = await db.tenantQuery(query, params, schoolId);
    return result.rows;
  },

  // ─── GET STUDENT MARKS FOR REPORT CARD ──────────────────
  getStudentMarksForReport: async (studentId, evaluationTypes, schoolId) => {
    if (!evaluationTypes || evaluationTypes.length !== 2) {
      throw new Error('getStudentMarksForReport requires exactly two evaluation types.');
    }
    const [eval1, eval2] = evaluationTypes;

    const query = `
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        s.coefficient,
        m1.score AS eval1,
        m1.is_exempt AS eval1_exempt,
        m2.score AS eval2,
        m2.is_exempt AS eval2_exempt
      FROM students st
      JOIN classes c ON c.id = st.class_id
      JOIN subject_classes sc ON sc.class_name = c.class_name AND sc.school_id = $4
      JOIN subjects s ON s.id = sc.subject_id
      LEFT JOIN marks m1 ON m1.subject_id = s.id
                         AND m1.student_id = st.id
                         AND m1.evaluation_type = $2
                         AND m1.school_id = $4
      LEFT JOIN marks m2 ON m2.subject_id = s.id
                         AND m2.student_id = st.id
                         AND m2.evaluation_type = $3
                         AND m2.school_id = $4
      WHERE st.id = $1 AND st.school_id = $4
      GROUP BY s.id, s.name, s.coefficient, m1.score, m1.is_exempt, m2.score, m2.is_exempt
    `;
    const { rows } = await db.tenantQuery(
      query,
      [studentId, eval1, eval2, schoolId],
      schoolId
    );

    // A student is exempt only if BOTH evaluations are marked exempt
    // (if only one is exempt, we treat the student as offering)
    return rows.map((row) => ({
      ...row,
      is_exempt: row.eval1_exempt === true && row.eval2_exempt === true,
    }));
  },
};

module.exports = MarkModel;