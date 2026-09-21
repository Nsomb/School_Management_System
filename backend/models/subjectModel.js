// backend/models/subjectModel.js
const db = require("../config/db");

// Safe fallback: if the `created_at` or `for_all` columns don't exist, the
// SELECTs below will still work because we don't hard-depend on them for
// filtering. Use the SQL migration at the top of the answer to add them.
const SubjectModel = {
  // ─── CREATE ──────────────────────────────────────────────
  create: async (
    { name, coefficient, faculty_ids = [], specialty_ids = [], classes = [] },
    schoolId
  ) => {
    const client = await db.getConnection();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_school_id',
        String(schoolId),
      ]);

      const primaryFacultyId = faculty_ids.length > 0 ? faculty_ids[0] : null;
      const mainSpecialtyId = specialty_ids.length > 0 ? specialty_ids[0] : null;
      const for_all = classes.length === 0;

      const subjectResult = await client.query(
        `INSERT INTO subjects
           (name, coefficient, faculty_id, specialty_id, for_all, school_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, coefficient, primaryFacultyId, mainSpecialtyId, for_all, schoolId]
      );
      const subjectId = subjectResult.rows[0].id;

      // Insert subject_faculties links
      for (const facultyId of faculty_ids) {
        await client.query(
          `INSERT INTO subject_faculties (subject_id, faculty_id, school_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (subject_id, faculty_id) DO NOTHING`,
          [subjectId, facultyId, schoolId]
        );
      }

      // Insert subject_specialties links
      for (const specialtyId of specialty_ids) {
        await client.query(
          `INSERT INTO subject_specialties (subject_id, specialty_id, school_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [subjectId, specialtyId, schoolId]
        );
      }

      // Insert subject_classes links (by name)
      for (const className of classes) {
        await client.query(
          `INSERT INTO subject_classes (subject_id, class_name, school_id)
           VALUES ($1, $2, $3)`,
          [subjectId, className, schoolId]
        );
      }

      await client.query('COMMIT');
      return await SubjectModel.getById(subjectId, schoolId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ─── GET BY ID ───────────────────────────────────────────
  getById: async (id, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT
         s.id, s.name, s.coefficient, s.faculty_id, s.specialty_id, s.school_id,

         COALESCE((
           SELECT JSON_AGG(JSON_BUILD_OBJECT('id', f.id, 'name', f.name) ORDER BY f.name)
           FROM subject_faculties sf
           JOIN faculties f ON sf.faculty_id = f.id
           WHERE sf.subject_id = s.id
         ), '[]'::json) AS faculties,

         COALESCE((
           SELECT ARRAY_AGG(sf.faculty_id)
           FROM subject_faculties sf
           WHERE sf.subject_id = s.id
         ), ARRAY[]::int[]) AS faculty_ids,

         COALESCE((
           SELECT JSON_AGG(JSON_BUILD_OBJECT('id', sp.id, 'name', sp.name) ORDER BY sp.name)
           FROM subject_specialties ss
           JOIN specialties sp ON ss.specialty_id = sp.id
           WHERE ss.subject_id = s.id
         ), '[]'::json) AS specialties,

         COALESCE((
           SELECT ARRAY_AGG(ss.specialty_id)
           FROM subject_specialties ss
           WHERE ss.subject_id = s.id
         ), ARRAY[]::int[]) AS specialty_ids,

         COALESCE((
           SELECT ARRAY_AGG(sc.class_name ORDER BY sc.class_name)
           FROM subject_classes sc
           WHERE sc.subject_id = s.id
         ), ARRAY[]::text[]) AS classes

       FROM subjects s
       WHERE s.id = $1 AND s.school_id = $2`,
      [id, schoolId],
      schoolId
    );
    return result.rows[0] || null;
  },

  // ─── GET ALL (paginated, school-scoped) ──────────────────
  getAllWithPagination: async (skip, limit, schoolId) => {
    // NOTE: no `s.created_at` — your table doesn't have it.
    const result = await db.tenantQuery(
      `SELECT
         s.id, s.name, s.coefficient, s.faculty_id, s.specialty_id,

         COALESCE((
           SELECT JSON_AGG(JSON_BUILD_OBJECT('id', f.id, 'name', f.name) ORDER BY f.name)
           FROM subject_faculties sf
           JOIN faculties f ON sf.faculty_id = f.id
           WHERE sf.subject_id = s.id
         ), '[]'::json) AS faculties,

         COALESCE((
           SELECT ARRAY_AGG(sf.faculty_id)
           FROM subject_faculties sf
           WHERE sf.subject_id = s.id
         ), ARRAY[]::int[]) AS faculty_ids,

         COALESCE((
           SELECT ARRAY_AGG(sp.name ORDER BY sp.name)
           FROM subject_specialties ss
           JOIN specialties sp ON ss.specialty_id = sp.id
           WHERE ss.subject_id = s.id
         ), ARRAY[]::text[]) AS specialty_names,

         COALESCE((
           SELECT ARRAY_AGG(ss.specialty_id)
           FROM subject_specialties ss
           WHERE ss.subject_id = s.id
         ), ARRAY[]::int[]) AS specialty_ids,

         COALESCE((
           SELECT ARRAY_AGG(sc.class_name ORDER BY sc.class_name)
           FROM subject_classes sc
           WHERE sc.subject_id = s.id
         ), ARRAY[]::text[]) AS classes

       FROM subjects s
       WHERE s.school_id = $3
       ORDER BY s.name
       LIMIT $1 OFFSET $2`,
      [limit, skip, schoolId],
      schoolId
    );

    const countResult = await db.tenantQuery(
      `SELECT COUNT(*)::int AS count FROM subjects WHERE school_id = $1`,
      [schoolId],
      schoolId
    );

    return {
      subjects: result.rows,
      total: countResult.rows[0].count,
    };
  },

  // ─── GET BY CLASS NAME ───────────────────────────────────
  getByClassId: async (className, schoolId) => {
    const result = await db.tenantQuery(
      `SELECT DISTINCT
         s.id, s.name, s.coefficient, s.faculty_id, s.specialty_id,

         COALESCE((
           SELECT JSON_AGG(JSON_BUILD_OBJECT('id', f.id, 'name', f.name) ORDER BY f.name)
           FROM subject_faculties sf
           JOIN faculties f ON sf.faculty_id = f.id
           WHERE sf.subject_id = s.id
         ), '[]'::json) AS faculties,

         COALESCE((
           SELECT ARRAY_AGG(sc.class_name ORDER BY sc.class_name)
           FROM subject_classes sc
           WHERE sc.subject_id = s.id
         ), ARRAY[]::text[]) AS classes

       FROM subjects s
       JOIN subject_classes sc ON s.id = sc.subject_id AND sc.school_id = $2
       WHERE LOWER(sc.class_name) = LOWER($1) AND s.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return result.rows;
  },

  // ─── UPDATE ──────────────────────────────────────────────
  update: async (
    id,
    { name, coefficient, faculty_ids = [], specialty_ids = [], classes = [] },
    schoolId
  ) => {
    const client = await db.getConnection();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_school_id',
        String(schoolId),
      ]);

      const primaryFacultyId = faculty_ids.length > 0 ? faculty_ids[0] : null;
      const mainSpecialtyId = specialty_ids.length > 0 ? specialty_ids[0] : null;
      const for_all = classes.length === 0;

      await client.query(
        `UPDATE subjects
         SET name = $1, coefficient = $2, faculty_id = $3, specialty_id = $4, for_all = $5
         WHERE id = $6 AND school_id = $7`,
        [name, coefficient, primaryFacultyId, mainSpecialtyId, for_all, id, schoolId]
      );

      await client.query(
        `DELETE FROM subject_faculties WHERE subject_id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      for (const facultyId of faculty_ids) {
        await client.query(
          `INSERT INTO subject_faculties (subject_id, faculty_id, school_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (subject_id, faculty_id) DO NOTHING`,
          [id, facultyId, schoolId]
        );
      }

      await client.query(
        `DELETE FROM subject_specialties WHERE subject_id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      for (const specialtyId of specialty_ids) {
        await client.query(
          `INSERT INTO subject_specialties (subject_id, specialty_id, school_id)
           VALUES ($1, $2, $3)`,
          [id, specialtyId, schoolId]
        );
      }

      await client.query(
        `DELETE FROM subject_classes WHERE subject_id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      for (const className of classes) {
        await client.query(
          `INSERT INTO subject_classes (subject_id, class_name, school_id)
           VALUES ($1, $2, $3)`,
          [id, className, schoolId]
        );
      }

      await client.query('COMMIT');
      return await SubjectModel.getById(id, schoolId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ─── DELETE ──────────────────────────────────────────────
  delete: async (id, schoolId) => {
    const client = await db.getConnection();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_school_id',
        String(schoolId),
      ]);

      const check = await client.query(
        `SELECT * FROM subjects WHERE id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      const subject = check.rows[0];
      if (!subject) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `DELETE FROM subject_faculties WHERE subject_id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      await client.query(
        `DELETE FROM subject_specialties WHERE subject_id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      await client.query(
        `DELETE FROM subject_classes WHERE subject_id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      await client.query(
        `DELETE FROM subjects WHERE id = $1 AND school_id = $2`,
        [id, schoolId]
      );

      await client.query('COMMIT');
      return subject;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = SubjectModel;