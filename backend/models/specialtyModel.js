// backend/models/specialtyModel.js
const db = require("../config/db");

const SpecialtyModel = {
  create: async ({ name, faculty_id }, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO specialties (name, faculty_id, school_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, faculty_id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getByFaculty: async (faculty_id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM specialties
       WHERE faculty_id = $1 AND school_id = $2
       ORDER BY name`,
      [faculty_id, schoolId],
      schoolId
    );
    return result.rows;
  },

  // ⚡ NEW: fetch for MULTIPLE faculties at once
  getByFaculties: async (facultyIds, schoolId) => {
    if (!Array.isArray(facultyIds) || facultyIds.length === 0) return [];
    const result = await db.tenantQuery(
      `SELECT s.*, f.name AS faculty_name
       FROM specialties s
       JOIN faculties f ON s.faculty_id = f.id
       WHERE s.faculty_id = ANY($1::int[]) AND s.school_id = $2
       ORDER BY f.name, s.name`,
      [facultyIds, schoolId],
      schoolId
    );
    return result.rows;
  },

  findById: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM specialties WHERE id = $1 AND school_id = $2`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  update: async (id, { name, faculty_id }, schoolId) => {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (faculty_id !== undefined) { fields.push(`faculty_id = $${idx++}`); values.push(faculty_id); }

    if (fields.length === 0) return null;

    values.push(id);
    values.push(schoolId);
    const result = await db.tenantQuery(
      `UPDATE specialties SET ${fields.join(', ')}
       WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
      values,
      schoolId
    );
    return result.rows[0];
  },

  delete: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM specialties WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },
};

module.exports = SpecialtyModel;