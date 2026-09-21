// backend/models/ClassListModel.js
const db = require('../config/db');

const ClassListModel = {
  getStudentsForBlankMarkSheet: async (className, schoolId) => {
    if (!className || typeof className !== 'string') return [];

    const result = await db.tenantQuery(
      `SELECT
          s.id AS student_id,
          s.name AS student_name,
          s.sex,
          s.date_of_birth
       FROM students s
       WHERE s.class_id = (
         SELECT id FROM classes WHERE class_name ILIKE $1 AND school_id = $2 LIMIT 1
       )
       AND s.school_id = $2
       ORDER BY s.name ASC`,
      [className.trim(), schoolId],
      schoolId
    );
    return result?.rows || [];
  },

  getDistinctClassNames: async (schoolId) => {
    const result = await db.tenantQuery(
      `SELECT class_name FROM classes WHERE school_id = $1 ORDER BY class_name ASC`,
      [schoolId],
      schoolId
    );
    return result?.rows?.map(r => r.class_name) || [];
  },
};

module.exports = ClassListModel;