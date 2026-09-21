// backend/models/questionModel.js
const db = require("../config/db");

const QuestionModel = {
  create: async ({ teacher_id, subject_id, file_path }, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO questions (teacher_id, subject_id, question_text, submission_date, status, school_id)
       VALUES ($1, $2, $3, CURRENT_DATE, 'Pending', $4)
       RETURNING *`,
      [teacher_id, subject_id, file_path, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  findById: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM questions WHERE id = $1 AND school_id = $2`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getQuestionsByTeacher: async (teacher_id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT q.*, s.name AS subject_name
       FROM questions q
       LEFT JOIN subjects s ON q.subject_id = s.id
       WHERE q.teacher_id = $1 AND q.school_id = $2
       ORDER BY q.submission_date DESC`,
      [teacher_id, schoolId],
      schoolId
    );
    return result.rows;
  },

  getAllWithFilters: async ({ subject_id, status } = {}, schoolId) => {
    let query = `
      SELECT q.*,
             s.name AS subject_name,
             t.full_name AS teacher_name
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN teachers t ON q.teacher_id = t.id
      WHERE q.school_id = $1
    `;
    const params = [schoolId];
    let idx = 2;

    if (subject_id) {
      query += ` AND q.subject_id = $${idx++}`;
      params.push(subject_id);
    }
    if (status) {
      query += ` AND q.status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY q.submission_date DESC`;

    const result = await db.tenantQuery(query, params, schoolId);
    return result.rows;
  },

  updateFilePath: async (id, file_path, schoolId) => {
    const result = await db.tenantQuery(
      `UPDATE questions SET question_text = $1
       WHERE id = $2 AND school_id = $3
       RETURNING *`,
      [file_path, id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  updateStatusAndNotes: async (id, status, notes, schoolId) => {
    const result = await db.tenantQuery(
      `UPDATE questions SET status = $1, notes = $2
       WHERE id = $3 AND school_id = $4
       RETURNING *`,
      [status, notes || null, id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  delete: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM questions WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  isTeacherAssignedToSubject: async (teacher_id, subject_id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT 1 FROM teacher_assignments
       WHERE teacher_id = $1 AND subject_id = $2 AND school_id = $3`,
      [teacher_id, subject_id, schoolId],
      schoolId
    );
    return result.rows.length > 0;
  },
};

module.exports = QuestionModel;