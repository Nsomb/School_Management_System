// backend/models/SubjectClassModel.js
const db = require('../config/db');

const SubjectClassModel = {
  create: async ({ subject_id, class_name }, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO subject_classes (subject_id, class_name, school_id) VALUES ($1, $2, $3) RETURNING *`,
      [subject_id, class_name, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getAll: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT sc.id, sc.class_name, s.id AS subject_id, s.name AS subject_name
       FROM subject_classes sc
       JOIN subjects s ON sc.subject_id = s.id
       WHERE sc.school_id = $1
       ORDER BY sc.class_name, s.name`,
      [schoolId],
      schoolId
    );
    return result.rows;
  },

  getSubjectsByClass: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT sc.id AS subject_class_id, s.id AS subject_id,
              s.name AS subject_name, s.coefficient, sc.class_name
       FROM subject_classes sc
       JOIN subjects s ON sc.subject_id = s.id
       WHERE LOWER(sc.class_name) = LOWER($1) AND sc.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },

  getSubjectsByClassId: async (classId, schoolId) => {
    const classResult = await db.tenantQuery(
      `SELECT class_name FROM classes WHERE id = $1 AND school_id = $2`,
      [classId, schoolId],
      schoolId
    );
    if (classResult.rows.length === 0) return [];

    const className = classResult.rows[0].class_name;
    const result = await db.tenantQuery(
      `SELECT sc.id AS subject_class_id, s.id AS subject_id,
              s.name AS subject_name, s.coefficient, sc.class_name
       FROM subject_classes sc
       JOIN subjects s ON sc.subject_id = s.id
       WHERE LOWER(sc.class_name) = LOWER($1) AND sc.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },

  getDistinctClassNames: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT DISTINCT class_name FROM subject_classes WHERE school_id = $1 ORDER BY class_name`,
      [schoolId],
      schoolId
    );
    return result.rows.map(r => r.class_name);
  },

  delete: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM subject_classes WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  deleteBySubject: async (subject_id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM subject_classes WHERE subject_id = $1 AND school_id = $2 RETURNING *`,
      [subject_id, schoolId],
      schoolId
    );
    return result.rows;
  },

  deleteByClass: async (class_name, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM subject_classes WHERE LOWER(class_name) = LOWER($1) AND school_id = $2 RETURNING *`,
      [class_name, schoolId],
      schoolId
    );
    return result.rows;
  },

  update: async (id, updates, schoolId) => {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    values.push(schoolId);
    const result = await db.tenantQuery(
      `UPDATE subject_classes SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex} AND school_id = $${paramIndex + 1} RETURNING *`,
      values,
      schoolId
    );
    return result.rows[0];
  },

  getSubjectCountsByClass: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT c.id, c.class_name, COUNT(sc.id) AS subject_count
       FROM classes c
       LEFT JOIN subject_classes sc ON c.class_name = sc.class_name AND sc.school_id = $1
       WHERE c.school_id = $1
       GROUP BY c.id, c.class_name
       ORDER BY c.class_name`,
      [schoolId],
      schoolId
    );
    return result.rows;
  },
};

module.exports = SubjectClassModel;