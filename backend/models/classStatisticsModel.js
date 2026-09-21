// backend/models/classStatisticsModel.js
const db = require('../config/db');

const ClassStatisticsModel = {
  getStudentsInClass: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT s.id, s.name AS student_full_name, c.class_name, s.specialty_id
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE LOWER(c.class_name) = LOWER($1) AND c.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },

  getSubjectsForTeacherAndClass: async (teacherId, className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT DISTINCT s.id, s.name, s.coefficient
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN classes c ON ta.class_id = c.id
       WHERE ta.teacher_id = $1
         AND LOWER(c.class_name) = LOWER($2)
         AND ta.school_id = $3`,
      [teacherId, className, schoolId],
      schoolId
    );
    return result.rows;
  },

  getAllSubjectsForClass: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT s.id, s.name, s.coefficient
       FROM subjects s
       WHERE s.id IN (
         SELECT subject_id FROM subject_classes
         WHERE LOWER(class_name) = LOWER($1) AND school_id = $2
       )
       AND s.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },

  getAllStudentMarksForClass: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT m.student_id, m.subject_id, m.score, m.evaluation_type,
              m.submission_date, s.name AS student_full_name,
              sub.name AS subject_name, sub.coefficient
       FROM marks m
       JOIN students s ON m.student_id = s.id
       JOIN subjects sub ON m.subject_id = sub.id
       JOIN classes c ON s.class_id = c.id
       WHERE LOWER(c.class_name) = LOWER($1) AND c.school_id = $2
       ORDER BY m.submission_date DESC`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },
};

module.exports = ClassStatisticsModel;