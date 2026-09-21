const db = require('../config/db');

const ExpectedDaysModel = {
  /**
   * Set expected days for teachers
   */
  setExpectedDays: async (teacherId, dayOfWeek, isFullDayExpected, expectedHalfDayType) => {
    const query = `
      INSERT INTO teacher_expected_days 
        (teacher_id, day_of_week, is_full_day_expected, expected_half_day_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (teacher_id, day_of_week)
      DO UPDATE SET 
        is_full_day_expected = EXCLUDED.is_full_day_expected,
        expected_half_day_type = EXCLUDED.expected_half_day_type,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [
      teacherId, 
      dayOfWeek, 
      isFullDayExpected, 
      expectedHalfDayType
    ]);
    return result.rows[0];
  },

  /**
   * Get expected days for a teacher
   */
  getExpectedDaysByTeacher: async (teacherId) => {
    const result = await db.query(
      'SELECT * FROM teacher_expected_days WHERE teacher_id = $1 ORDER BY day_of_week',
      [teacherId]
    );
    return result.rows;
  },

  /**
   * Get all teachers with their expected days
   */
  getAllTeachersWithExpectedDays: async () => {
    const result = await db.query(`
      SELECT 
        t.id as teacher_id,
        t.full_name,
        t.email,
        t.phone_number,
        ed.day_of_week,
        ed.is_full_day_expected,
        ed.expected_half_day_type,
        ed.created_at,
        ed.updated_at
      FROM teachers t
      LEFT JOIN teacher_expected_days ed ON t.id = ed.teacher_id
      ORDER BY t.full_name, ed.day_of_week
    `);
    return result.rows;
  },

  /**
   * Delete expected day for a teacher
   */
  deleteExpectedDay: async (id) => {
    await db.query('DELETE FROM teacher_expected_days WHERE id = $1', [id]);
  },

  /**
   * Get teacher expected days summary for reporting
   */
  getExpectedDaysSummary: async () => {
    const result = await db.query(`
      SELECT 
        t.id as teacher_id,
        t.full_name,
        COUNT(ed.day_of_week) as total_expected_days,
        COUNT(CASE WHEN ed.is_full_day_expected = true THEN 1 END) as full_days_expected,
        COUNT(CASE WHEN ed.is_full_day_expected = false THEN 1 END) as half_days_expected
      FROM teachers t
      LEFT JOIN teacher_expected_days ed ON t.id = ed.teacher_id
      GROUP BY t.id, t.full_name
      ORDER BY t.full_name
    `);
    return result.rows;
  }
};

module.exports = ExpectedDaysModel;