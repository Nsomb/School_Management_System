// backend/models/classModel.js
const db = require("../config/db");

const ClassModel = {
  // ─── READ ────────────────────────────────────────────────
  getClassByName: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT id, class_name, progression_order, stream FROM classes
       WHERE LOWER(class_name) = LOWER($1) AND school_id = $2`,
      [className, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getClassById: async (classId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT id, class_name, progression_order, stream FROM classes
       WHERE id = $1 AND school_id = $2`,
      [classId, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getAllClasses: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT id,
              class_name AS name,
              class_name,
              progression_order,
              stream
       FROM classes
       WHERE school_id = $1
       ORDER BY progression_order NULLS LAST, stream NULLS FIRST, class_name`,
      [schoolId],
      schoolId
    );
    return result.rows;
  },

  // ─── CREATE ──────────────────────────────────────────────
  create: async ({ class_name, progression_order, stream }, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO classes (class_name, progression_order, stream, school_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, class_name, progression_order, stream`,
      [class_name, progression_order, stream, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  // ─── UPDATE ──────────────────────────────────────────────
  update: async (id, { class_name, progression_order, stream }, schoolId) => {
    const result = await db.tenantQuery(
      `UPDATE classes
       SET class_name = $1, progression_order = $2, stream = $3
       WHERE id = $4 AND school_id = $5
       RETURNING id, class_name, progression_order, stream`,
      [class_name, progression_order, stream, id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  // ─── DELETE ──────────────────────────────────────────────
  delete: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `DELETE FROM classes
       WHERE id = $1 AND school_id = $2
       RETURNING id, class_name`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  // ─── GUARDS (used by controller before delete) ───────────
  countStudents: async (classId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT COUNT(*)::int AS count FROM students
       WHERE class_id = $1 AND school_id = $2`,
      [classId, schoolId],
      schoolId
    );
    return result.rows[0]?.count || 0;
  },

  countTeacherAssignments: async (classId, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT COUNT(*)::int AS count FROM teacher_assignments
       WHERE class_id = $1 AND school_id = $2`,
      [classId, schoolId],
      schoolId
    );
    return result.rows[0]?.count || 0;
  },

  // ─── SYNC WITH subject_classes (string-based table) ──────
  // When a class is renamed, update the string references so old
  // subjects still point to the class's new name.
  renameSubjectClassReferences: async (oldName, newName, schoolId) => {
    await db.tenantQuery(
      `UPDATE subject_classes SET class_name = $1
       WHERE LOWER(class_name) = LOWER($2) AND school_id = $3`,
      [newName, oldName, schoolId],
      schoolId
    );
  },

  // When a class is deleted, remove its dangling string references.
  deleteSubjectClassReferences: async (className, schoolId) => {
    await db.tenantQuery(
      `DELETE FROM subject_classes
       WHERE LOWER(class_name) = LOWER($1) AND school_id = $2`,
      [className, schoolId],
      schoolId
    );
  },

  // ─── PROMOTION LOGIC ─────────────────────────────────────
  getNextClassInProgression: async (currentClass, schoolId) => {
    if (
      !currentClass ||
      currentClass.progression_order === null ||
      currentClass.progression_order === undefined
    ) {
      return null;
    }

    const result = await db.tenantQuery(
      `SELECT id, class_name, progression_order, stream
       FROM classes
       WHERE school_id = $1
         AND progression_order > $2
         AND stream IS NOT DISTINCT FROM $3
       ORDER BY progression_order ASC
       LIMIT 1`,
      [schoolId, currentClass.progression_order, currentClass.stream],
      schoolId
    );
    return result.rows[0] || null;
  },
};

module.exports = ClassModel;