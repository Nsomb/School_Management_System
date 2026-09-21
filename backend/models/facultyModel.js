// backend/models/facultyModel.js
const db = require("../config/db");

const FacultyModel = {
  create: async (name, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO faculties (name, school_id) VALUES ($1, $2) RETURNING *`,
      [name, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getAll: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT
         f.id,
         f.name,
         COALESCE((
           SELECT COUNT(*)::int
           FROM specialties s
           WHERE s.faculty_id = f.id AND s.school_id = $1
         ), 0) AS specialty_count
       FROM faculties f
       WHERE f.school_id = $1
       ORDER BY f.name`,
      [schoolId],
      schoolId
    );
    return result.rows;
  },

  update: async (id, name, schoolId) => {
    const result = await db.tenantQuery(
      `UPDATE faculties SET name = $1
       WHERE id = $2 AND school_id = $3
       RETURNING *`,
      [name, id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  delete: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM faculties WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  countSpecialties: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT COUNT(*)::int AS count FROM specialties
       WHERE faculty_id = $1 AND school_id = $2`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0]?.count || 0;
  },
};

module.exports = FacultyModel;