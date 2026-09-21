// backend/models/competencyModel.js
const db = require("../config/db");

const CompetencyModel = {
  createOrUpdate: async ({ teacher_id, subject_id, class_id, evaluation_type, competency }, schoolId) => {
    const result = await db.tenantQuery(
      `INSERT INTO test_competency
        (subject_id, class_id, evaluation_type, competency, school_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (school_id, subject_id, class_id, evaluation_type)
       DO UPDATE SET competency = EXCLUDED.competency
       RETURNING *`,
      [subject_id, class_id, evaluation_type, competency, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getCompetency: async (subject_id, class_id, evaluation_type, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT * FROM test_competency
       WHERE subject_id = $1 AND class_id = $2 AND evaluation_type = $3 AND school_id = $4`,
      [subject_id, class_id, evaluation_type, schoolId],
      schoolId
    );
    return result.rows[0];
  },

  getCompetenciesForClass: async (class_id, evaluationTypes, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT subject_id, evaluation_type, competency
       FROM test_competency
       WHERE class_id = $1 AND evaluation_type = ANY($2::text[]) AND school_id = $3`,
      [class_id, evaluationTypes, schoolId],
      schoolId
    );
    return rows;
  },
};

module.exports = CompetencyModel;