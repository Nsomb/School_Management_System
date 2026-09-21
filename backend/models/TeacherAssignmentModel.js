// backend/models/TeacherAssignmentModel.js
const db = require('../config/db');

const TeacherAssignmentModel = {
  // ─── BULK CREATE (scoped) ──────────────────────────────────
  bulkCreate: async ({ teacher_id, class_id, subject_ids, school_id }) => {
    const client = await db.getConnection();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.current_school_id', String(school_id)]);

      const insertPromises = subject_ids.map(subject_id =>
        client.query(
          `INSERT INTO teacher_assignments (teacher_id, subject_id, class_id, school_id)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [teacher_id, subject_id, class_id, school_id]
        )
      );

      const results = await Promise.all(insertPromises);
      const newAssignments = results.map(res => res.rows[0]);

      await client.query('COMMIT');
      return newAssignments;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ─── GET BY TEACHER (scoped) ───────────────────────────────
  getByTeacherId: async (teacher_id, school_id) => {
    const result = await db.tenantQuery(
      `SELECT
        ta.id,
        c.id AS class_id,
        c.class_name AS class_name,
        s.id AS subject_id,
        s.name AS subject_name,
        s.coefficient,
        t.id AS teacher_id,
        t.full_name AS teacher_name
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN teachers t ON ta.teacher_id = t.id
       JOIN classes c ON ta.class_id = c.id
       WHERE ta.teacher_id = $1 AND ta.school_id = $2
       ORDER BY c.class_name, s.name`,
      [teacher_id, school_id],
      school_id
    );
    return result.rows;
  },

  // ─── GET BY SUBJECT + CLASS (scoped) ───────────────────────
  getBySubjectAndClass: async ({ subject_id, class_id, school_id }) => {
    const result = await db.tenantQuery(
      `SELECT
        ta.id,
        c.id AS class_id,
        c.class_name AS class_name,
        s.id AS subject_id,
        s.name AS subject_name,
        t.id AS teacher_id,
        t.full_name AS teacher_name
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN teachers t ON ta.teacher_id = t.id
       JOIN classes c ON ta.class_id = c.id
       WHERE ta.subject_id = $1 AND ta.class_id = $2 AND ta.school_id = $3`,
      [subject_id, class_id, school_id],
      school_id
    );
    return result.rows;
  },

  // ─── DELETE (scoped) ───────────────────────────────────────
  delete: async (id, school_id) => {
    const result = await db.tenantQuery(
      `DELETE FROM teacher_assignments WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, school_id],
      school_id
    );
    return result.rows[0];
  },
};

module.exports = TeacherAssignmentModel;