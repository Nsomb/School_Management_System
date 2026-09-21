// models/TimetableConfigModel.js
const db = require('../config/db');

const TimetableConfigModel = {
    // --- Periods Management ---
    /**
     * Retrieves all configured periods.
     * @returns {Promise<Array<object>>} An array of period records.
     */
    getAllPeriods: async () => {
        const result = await db.query(
            `SELECT id, period_number, start_time, end_time, is_break, break_name
             FROM periods
             ORDER BY period_number NULLS FIRST, start_time;` // NULLS FIRST to handle break without period_number if exists
        );
        return result.rows;
    },
    // No specific CREATE/UPDATE/DELETE for periods via API, as they are usually fixed by initial DDL.
    // If you need it, we can add it later.

    // --- Teacher Availabilities Management ---
    /**
     * Creates a new teacher availability record.
     * @param {number} teacherId - The ID of the teacher.
     * @param {string} dayOfWeek - The day of the week (e.g., 'Monday').
     * @returns {Promise<object>} The newly created availability record.
     */
    createTeacherAvailability: async (teacherId, dayOfWeek) => {
        const result = await db.query(
            `INSERT INTO teacher_availabilities (teacher_id, day_of_week)
             VALUES ($1, $2)
             RETURNING id, teacher_id, day_of_week;`,
            [teacherId, dayOfWeek]
        );
        return result.rows[0];
    },

    /**
     * Retrieves teacher availabilities for a specific teacher.
     * @param {number} teacherId - The ID of the teacher.
     * @returns {Promise<Array<object>>} An array of availability records.
     */
    getTeacherAvailabilitiesByTeacher: async (teacherId) => {
        const result = await db.query(
            `SELECT ta.id, ta.teacher_id, t.full_name AS teacher_name, ta.day_of_week
             FROM teacher_availabilities ta
             JOIN teachers t ON ta.teacher_id = t.id
             WHERE ta.teacher_id = $1
             ORDER BY ta.day_of_week;`, // Could add custom day order if needed
            [teacherId]
        );
        return result.rows;
    },

    /**
     * Deletes a teacher availability record by its ID.
     * @param {number} id - The ID of the availability record to delete.
     * @returns {Promise<boolean>} True if deleted, false if not found.
     */
    deleteTeacherAvailability: async (id) => {
        const result = await db.query(
            `DELETE FROM teacher_availabilities WHERE id = $1 RETURNING id;`,
            [id]
        );
        return result.rows.length > 0; // Return true if a record was found and deleted
    },

    // --- Teacher-Subject-Class Assignments Management ---
    /**
     * Creates a new teacher-subject-class assignment.
     * @param {number} teacherId - The ID of the teacher.
     * @param {number} subjectId - The ID of the subject.
     * @param {string} className - The name of the class (e.g., '10A').
     * @param {boolean} [isTradeSubject=false] - Whether it's a trade subject.
     * @param {number} [minWeeklyPeriods=2] - Minimum number of periods per week.
     * @returns {Promise<object>} The newly created assignment record.
     */
    createTeacherSubjectClass: async (teacherId, subjectId, className, isTradeSubject = false, minWeeklyPeriods = 2) => {
        const result = await db.query(
            `INSERT INTO teacher_subject_classes (teacher_id, subject_id, class_name, is_trade_subject, min_weekly_periods)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, teacher_id, subject_id, class_name, is_trade_subject, min_weekly_periods;`,
            [teacherId, subjectId, className, isTradeSubject, minWeeklyPeriods]
        );
        return result.rows[0];
    },

    /**
     * Retrieves all teacher-subject-class assignments.
     * @returns {Promise<Array<object>>} An array of assignment records with teacher and subject names.
     */
    getAllTeacherSubjectClasses: async () => {
        const result = await db.query(
            `SELECT
                tsc.id,
                tsc.teacher_id,
                t.full_name AS teacher_name, -- Changed from t.name to t.full_name
                tsc.subject_id,
                s.name AS subject_name,
                tsc.class_name,
                tsc.is_trade_subject,
                tsc.min_weekly_periods
             FROM
                teacher_subject_classes tsc
             JOIN
                teachers t ON tsc.teacher_id = t.id
             JOIN
                subjects s ON tsc.subject_id = s.id
             ORDER BY
                t.full_name, tsc.class_name, s.name;` // Changed from t.name to t.full_name
        );
        return result.rows;
    },

    /**
     * Retrieves a single teacher-subject-class assignment by its ID.
     * @param {number} id - The ID of the assignment.
     * @returns {Promise<object|null>} The assignment record or null if not found.
     */
    getTeacherSubjectClassById: async (id) => {
        const result = await db.query(
            `SELECT
                tsc.id,
                tsc.teacher_id,
                t.full_name AS teacher_name, -- Changed from t.name to t.full_name
                tsc.subject_id,
                s.name AS subject_name,
                tsc.class_name,
                tsc.is_trade_subject,
                tsc.min_weekly_periods
             FROM
                teacher_subject_classes tsc
             JOIN
                teachers t ON tsc.teacher_id = t.id
             JOIN
                subjects s ON tsc.subject_id = s.id
             WHERE tsc.id = $1;`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Updates an existing teacher-subject-class assignment.
     * @param {number} id - The ID of the assignment to update.
     * @param {number} teacherId - The new ID of the teacher.
     * @param {number} subjectId - The new ID of the subject.
     * @param {string} className - The new class name.
     * @param {boolean} isTradeSubject - The new trade subject status.
     * @param {number} minWeeklyPeriods - The new minimum weekly periods.
     * @returns {Promise<object|null>} The updated assignment record or null if not found.
     */
    updateTeacherSubjectClass: async (id, teacherId, subjectId, className, isTradeSubject, minWeeklyPeriods) => {
        const result = await db.query(
            `UPDATE teacher_subject_classes
             SET teacher_id = $2, subject_id = $3, class_name = $4, is_trade_subject = $5, min_weekly_periods = $6
             WHERE id = $1
             RETURNING id, teacher_id, subject_id, class_name, is_trade_subject, min_weekly_periods;`,
            [id, teacherId, subjectId, className, isTradeSubject, minWeeklyPeriods]
        );
        return result.rows[0];
    },

    /**
     * Deletes a teacher-subject-class assignment by its ID.
     * @param {number} id - The ID of the assignment to delete.
     * @returns {Promise<boolean>} True if deleted, false if not found.
     */
    deleteTeacherSubjectClass: async (id) => {
        const result = await db.query(
            `DELETE FROM teacher_subject_classes WHERE id = $1 RETURNING id;`,
            [id]
        );
        // Returns true if a row was deleted (i.e., result.rows has content), false otherwise.
        return result.rows.length > 0;
    }
};

module.exports = TimetableConfigModel;