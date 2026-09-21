// backend/models/studentModel.js
const db = require("../config/db");
const ClassModel = require("./ClassModel");

const SELECT_FIELDS = `
  s.id, s.name, s.class_id, c.class_name AS class_name,
  TO_CHAR(s.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
  s.sex, s.guidance_phone_number, s.school_id,
  f.id AS faculty_id, f.name AS faculty_name,
  sp.id AS specialty_id, sp.name AS specialty_name
`;

const JOIN_CLAUSES = `
  LEFT JOIN classes c ON s.class_id = c.id
  LEFT JOIN faculties f ON s.faculty_id = f.id
  LEFT JOIN specialties sp ON s.specialty_id = sp.id
`;

const StudentModel = {
  create: async ({ name, class_id, date_of_birth, faculty_id, specialty_id, sex, guidance_phone_number }, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO students
        (name, class_id, date_of_birth, faculty_id, specialty_id, sex, guidance_phone_number, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, class_id, date_of_birth, faculty_id, specialty_id, sex, guidance_phone_number, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getById: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT ${SELECT_FIELDS} FROM students s ${JOIN_CLAUSES}
       WHERE s.id = $1 AND s.school_id = $2`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0] || null;
  },

  getAll: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT ${SELECT_FIELDS} FROM students s ${JOIN_CLAUSES}
       WHERE s.school_id = $1 ORDER BY s.id`,
      [schoolId],
      schoolId
    );
    return result.rows;
  },

  getStudentsByClassId: async (classId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT ${SELECT_FIELDS} FROM students s ${JOIN_CLAUSES}
       WHERE s.class_id = $1 AND s.school_id = $2 ORDER BY s.id`,
      [classId, schoolId],
      schoolId
    );
    return result.rows;
  },

  getStudentsByName: async (nameQuery, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT ${SELECT_FIELDS} FROM students s ${JOIN_CLAUSES}
       WHERE s.name ILIKE $1 AND s.school_id = $2 ORDER BY s.id`,
      [`%${nameQuery}%`, schoolId],
      schoolId
    );
    return result.rows;
  },

  update: async (id, updates, schoolId) => {
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    values.push(schoolId);
    const result = await db.tenantQuery(
      `UPDATE students SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
      values,
      schoolId
    );
    return result.rows[0];
  },

  delete: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM students WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  transfer: async (studentId, newClassId, newSpecialtyId, schoolId) => {
    const result = await db.tenantQuery(
      `UPDATE students SET class_id = $1, specialty_id = $2
       WHERE id = $3 AND school_id = $4 RETURNING *`,
      [newClassId, newSpecialtyId, studentId, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  addSpecialty: async (studentId, specialtyId, schoolId) => {
    const check = await db.tenantQuery(
      `SELECT * FROM student_specialties
       WHERE student_id = $1 AND specialty_id = $2 AND school_id = $3`,
      [studentId, specialtyId, schoolId],
      schoolId
    );
    if (check.rows.length > 0) {
      throw new Error("Specialty already added to this student.");
    }
    const result = await db.tenantQuery(
      `INSERT INTO student_specialties (student_id, specialty_id, school_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [studentId, specialtyId, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  bulkTransfer: async (studentIds, newClassId, schoolId) => {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error("Student IDs array cannot be empty.");
    }
    const result = await db.tenantQuery(
      `UPDATE students SET class_id = $1
       WHERE id = ANY($2::int[]) AND school_id = $3 RETURNING *`,
      [newClassId, studentIds, schoolId],
      schoolId
    );
    return result.rows;
  },

  transferClassToNewAcademicYear: async (oldClassName, newClassName, schoolId) => {
    const oldClass = await ClassModel.getClassByName(oldClassName, schoolId);
    if (!oldClass) throw new Error(`Old class '${oldClassName}' not found.`);

    const newClass = await ClassModel.getClassByName(newClassName, schoolId);
    if (!newClass) throw new Error(`New class '${newClassName}' not found.`);

    const studentsInOldClass = await db.tenantQuery(
      `SELECT id FROM students WHERE class_id = $1 AND school_id = $2`,
      [oldClass.id, schoolId],
      schoolId
    );
    const studentIds = studentsInOldClass.rows.map((s) => s.id);

    if (studentIds.length === 0) return [];

    return await StudentModel.bulkTransfer(studentIds, newClass.id, schoolId);
  },
};

module.exports = StudentModel;