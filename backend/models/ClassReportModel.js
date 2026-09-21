// backend/models/ClassReportModel.js
const db = require('../config/db');

const ClassReportModel = {
  getStudentsInClass: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT s.id, s.name, s.sex,
              TO_CHAR(s.date_of_birth, 'YYYY-MM-DD') AS date_of_birth
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE LOWER(c.class_name) = LOWER($1) AND c.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },

  getClassEvaluationMarks: async (className, evaluationType, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT
          s.id AS student_id,
          s.name AS student_name,
          sub.id AS subject_id,
          sub.name AS subject_name,
          m.score AS mark_score,
          m.submission_date
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN subject_classes sc ON c.class_name = sc.class_name AND sc.school_id = $3
       JOIN subjects sub ON sc.subject_id = sub.id AND sub.school_id = $3
       LEFT JOIN marks m ON s.id = m.student_id
                        AND sub.id = m.subject_id
                        AND LOWER(m.evaluation_type) = LOWER($2)
       WHERE LOWER(c.class_name) = LOWER($1) AND c.school_id = $3
       ORDER BY s.name, sub.name`,
      [className, evaluationType, schoolId],
      schoolId
    );
    return result.rows;
  },

  getSubjectsForClass: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT sub.id, sub.name, sub.coefficient
       FROM subjects sub
       JOIN subject_classes sc ON sub.id = sc.subject_id AND sc.school_id = $2
       WHERE LOWER(sc.class_name) = LOWER($1) AND sub.school_id = $2
       ORDER BY sub.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },
};

module.exports = ClassReportModel;