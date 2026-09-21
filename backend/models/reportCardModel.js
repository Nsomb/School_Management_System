// backend/models/reportCardModel.js
const db = require("../config/db");

const ReportCardModel = {
  getCurrentAcademicYear: () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return currentMonth >= 8
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  },

  // ═══════════════════════════════════════════════════════════════════
  // ACADEMIC CALENDAR — atomic, race-condition-safe
  // ═══════════════════════════════════════════════════════════════════
  generateAcademicCalendar: async (academicYear, schoolId) => {
    try {
      const [startYear, endYear] = academicYear.split('-').map(Number);

      const termDates = {
        '1': { start_date: new Date(startYear, 8, 2), end_date: new Date(startYear, 11, 20) },
        '2': { start_date: new Date(endYear, 0, 6), end_date: new Date(endYear, 3, 4) },
        '3': { start_date: new Date(endYear, 3, 14), end_date: new Date(endYear, 6, 25) },
      };

      for (const [term, dates] of Object.entries(termDates)) {
        // ✅ Single atomic INSERT — no SELECT check, no race condition
        await db.tenantQuery(
          `INSERT INTO academic_calendar
             (academic_year, term, start_date, end_date, school_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (school_id, academic_year, term) DO NOTHING`,
          [academicYear, term, dates.start_date, dates.end_date, schoolId],
          schoolId
        );
      }
      return true;
    } catch (error) {
      console.error('Error generating academic calendar:', error);
      return false;
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // CLASSES
  // ═══════════════════════════════════════════════════════════════════
  getClasses: async (schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT DISTINCT class_name FROM classes WHERE school_id = $1 ORDER BY class_name`,
      [schoolId],
      schoolId
    );
    return rows.map((r) => r.class_name);
  },

  // ═══════════════════════════════════════════════════════════════════
  // TERMS — reads only, only generates if truly empty
  // ═══════════════════════════════════════════════════════════════════
  getTerms: async (schoolId) => {
    try {
      const currentAcademicYear = ReportCardModel.getCurrentAcademicYear();

      // First read
      const { rows } = await db.tenantQuery(
        `SELECT DISTINCT term FROM academic_calendar
         WHERE academic_year = $1 AND school_id = $2 ORDER BY term`,
        [currentAcademicYear, schoolId],
        schoolId
      );
      let terms = rows.map((r) => r.term.toString());

      // If nothing, try to seed the calendar ONCE
      if (terms.length === 0) {
        await ReportCardModel.generateAcademicCalendar(currentAcademicYear, schoolId);
        const { rows: newRows } = await db.tenantQuery(
          `SELECT DISTINCT term FROM academic_calendar
           WHERE academic_year = $1 AND school_id = $2 ORDER BY term`,
          [currentAcademicYear, schoolId],
          schoolId
        );
        terms = newRows.map((r) => r.term.toString());
      }

      // Fallback — never let this endpoint fail
      if (terms.length === 0) terms = ['1', '2', '3'];
      return terms;
    } catch (err) {
      console.error('Error fetching terms:', err);
      return ['1', '2', '3'];
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // ACADEMIC YEARS
  // ═══════════════════════════════════════════════════════════════════
  getAcademicYears: async (schoolId) => {
    try {
      const { rows } = await db.tenantQuery(
        `SELECT DISTINCT academic_year FROM academic_calendar
         WHERE school_id = $1 ORDER BY academic_year DESC`,
        [schoolId],
        schoolId
      );
      let years = rows.map((r) => r.academic_year);
      const current = ReportCardModel.getCurrentAcademicYear();
      if (!years.includes(current)) years.unshift(current);
      return years;
    } catch (error) {
      console.error('Error fetching academic years:', error);
      return [ReportCardModel.getCurrentAcademicYear()];
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // STUDENT DETAILS
  // ═══════════════════════════════════════════════════════════════════
  getStudentDetails: async (studentId, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT s.id, s.name AS full_name, s.date_of_birth, s.sex AS gender,
              c.class_name, s.specialty_id, sp.name AS specialty_name, f.name AS faculty_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN specialties sp ON s.specialty_id = sp.id
       LEFT JOIN faculties f ON sp.faculty_id = f.id
       WHERE s.id = $1 AND s.school_id = $2`,
      [studentId, schoolId],
      schoolId
    );
    return rows[0] || null;
  },

  // ═══════════════════════════════════════════════════════════════════
  // SUBJECTS
  // ═══════════════════════════════════════════════════════════════════
  getSubjectsBySpecialty: async (specialtyId, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT DISTINCT sub.id, sub.name, sub.coefficient
       FROM subjects sub
       JOIN subject_classes sc ON sub.id = sc.subject_id AND sc.school_id = $2
       JOIN classes c ON sc.class_name = c.class_name AND c.school_id = $2
       JOIN students st ON c.id = st.class_id AND st.school_id = $2
       WHERE st.specialty_id = $1
       ORDER BY sub.name`,
      [specialtyId, schoolId],
      schoolId
    );
    return rows;
  },

  getSubjectsByClassName: async (className, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT DISTINCT sub.id, sub.name, sub.coefficient
       FROM subjects sub
       JOIN subject_classes sc ON sub.id = sc.subject_id
       WHERE sc.class_name = $1 AND sc.school_id = $2
       ORDER BY sub.name`,
      [className, schoolId],
      schoolId
    );
    return rows;
  },

  // ═══════════════════════════════════════════════════════════════════
  // MARKS
  // ═══════════════════════════════════════════════════════════════════
  getAllStudentMarksForClass: async (className, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT m.student_id, s.name AS student_full_name, m.subject_id,
              subj.name AS subject_name, subj.coefficient,
              m.evaluation_type, m.score, m.submission_date
       FROM marks m
       JOIN students s ON m.student_id = s.id
       JOIN subjects subj ON m.subject_id = subj.id
       JOIN classes c ON s.class_id = c.id
       WHERE c.class_name = $1 AND s.school_id = $2`,
      [className, schoolId],
      schoolId
    );
    return rows;
  },

  getAllStudentMarksForClassAndTerm: async (classId, term, academicYear, schoolId) => {
    const termEvals = ReportCardModel._getEvaluationTypesForTerm(term);
    const { rows } = await db.tenantQuery(
      `SELECT m.student_id, m.subject_id, m.evaluation_type, m.score, m.submission_date,
              s.name AS student_full_name, subj.name AS subject_name, subj.coefficient
       FROM marks m
       JOIN students s ON m.student_id = s.id
       JOIN subjects subj ON m.subject_id = subj.id
       JOIN classes c ON s.class_id = c.id
       WHERE c.id = $1 AND s.school_id = $2
         AND m.evaluation_type = ANY($3::text[])`,
      [classId, schoolId, termEvals],
      schoolId
    );
    return rows;
  },

  getAllSubjectsForClass: async (classId, specialtyId, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT DISTINCT sub.id, sub.name, sub.coefficient
       FROM subjects sub
       JOIN subject_classes sc ON sub.id = sc.subject_id
       JOIN classes c ON sc.class_name = c.class_name
       WHERE c.id = $1 AND sc.school_id = $2
         AND (sub.for_all = true OR sub.id IN (
           SELECT subject_id FROM subject_specialties
           WHERE specialty_id = $3 AND school_id = $2
         ))
       ORDER BY sub.name`,
      [classId, schoolId, specialtyId],
      schoolId
    );
    return rows;
  },

  _getEvaluationTypesForTerm: (term) => {
    const map = {
      '1st Term': ['1st Evaluation', '2nd Evaluation'],
      '2nd Term': ['3rd Evaluation', '4th Evaluation'],
      '3rd Term': ['5th Evaluation', '6th Evaluation'],
      'Term 1': ['1st Evaluation', '2nd Evaluation'],
      'Term 2': ['3rd Evaluation', '4th Evaluation'],
      'Term 3': ['5th Evaluation', '6th Evaluation'],
    };
    return map[term] || [
      '1st Evaluation', '2nd Evaluation', '3rd Evaluation',
      '4th Evaluation', '5th Evaluation', '6th Evaluation',
    ];
  },

  // ═══════════════════════════════════════════════════════════════════
  // TERM DATES
  // ═══════════════════════════════════════════════════════════════════
  getTermDates: async (academicYear, term, schoolId) => {
    try {
      const { rows } = await db.tenantQuery(
        `SELECT start_date, end_date FROM academic_calendar
         WHERE academic_year = $1 AND term = $2 AND school_id = $3`,
        [academicYear, term, schoolId],
        schoolId
      );
      if (rows.length > 0) return rows[0];

      // Seed and try once more
      await ReportCardModel.generateAcademicCalendar(academicYear, schoolId);
      const { rows: newRows } = await db.tenantQuery(
        `SELECT start_date, end_date FROM academic_calendar
         WHERE academic_year = $1 AND term = $2 AND school_id = $3`,
        [academicYear, term, schoolId],
        schoolId
      );
      return newRows[0] || null;
    } catch (err) {
      console.error('Error fetching term dates:', err);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // STUDENTS BY CLASS
  // ═══════════════════════════════════════════════════════════════════
  getStudentsByClass: async (className, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT s.id, s.name
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE c.class_name = $1 AND s.school_id = $2
       ORDER BY s.name`,
      [className, schoolId],
      schoolId
    );
    return rows;
  },

  getClassId: async (className, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT id FROM classes WHERE class_name = $1 AND school_id = $2`,
      [className, schoolId],
      schoolId
    );
    return rows.length > 0 ? rows[0].id : null;
  },

  // ═══════════════════════════════════════════════════════════════════
  // CLASS AVERAGES
  // ═══════════════════════════════════════════════════════════════════
  getClassAverages: async (className, evaluationTypes, schoolId) => {
    const [eval1, eval2] = evaluationTypes;
    const { rows } = await db.tenantQuery(
      `SELECT st.id AS student_id,
              COALESCE(AVG(COALESCE(m1.score, 0) + COALESCE(m2.score, 0)) / 2.0, 0) AS average
       FROM students st
       JOIN classes c ON c.id = st.class_id
       LEFT JOIN marks m1 ON m1.student_id = st.id AND m1.evaluation_type = $2
       LEFT JOIN marks m2 ON m2.student_id = st.id AND m2.evaluation_type = $3
       WHERE c.class_name = $1 AND st.school_id = $4
       GROUP BY st.id`,
      [className, eval1, eval2, schoolId],
      schoolId
    );
    return rows.map((r) => ({ studentId: r.student_id, average: parseFloat(r.average) }));
  },

  // ═══════════════════════════════════════════════════════════════════
  // ATTENDANCE STATS
  // ═══════════════════════════════════════════════════════════════════
  getAttendanceStatsForStudent: async (studentId, academicYear, term, schoolId) => {
    try {
      const termDates = await ReportCardModel.getTermDates(academicYear, term, schoolId);
      if (!termDates) return { present: 0, absent: 0, percentage: 0 };

      const { rows } = await db.tenantQuery(
        `SELECT
            COUNT(*) FILTER (WHERE status = 'Present') AS present,
            COUNT(*) FILTER (WHERE status = 'Absent') AS absent,
            COUNT(*) AS total
         FROM student_attendances
         WHERE student_id = $1
           AND attendance_date BETWEEN $2 AND $3
           AND is_deleted = false`,
        [studentId, termDates.start_date, termDates.end_date],
        schoolId
      );
      const row = rows[0];
      const present = parseInt(row.present) || 0;
      const absent = parseInt(row.absent) || 0;
      const total = parseInt(row.total) || 0;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      return { present, absent, percentage };
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
      return { present: 0, absent: 0, percentage: 0 };
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // ANNUAL AVERAGES
  // ═══════════════════════════════════════════════════════════════════
  getAnnualClassAverages: async (className, schoolId) => {
    const { rows } = await db.tenantQuery(
      `SELECT st.id AS student_id, s.id AS subject_id, s.coefficient,
              m1.score AS eval1, m2.score AS eval2, m3.score AS eval3,
              m4.score AS eval4, m5.score AS eval5, m6.score AS eval6
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN subject_classes sc ON sc.class_name = c.class_name
       JOIN subjects s ON s.id = sc.subject_id
       LEFT JOIN marks m1 ON m1.student_id = st.id AND m1.subject_id = s.id AND m1.evaluation_type = '1st Evaluation'
       LEFT JOIN marks m2 ON m2.student_id = st.id AND m2.subject_id = s.id AND m2.evaluation_type = '2nd Evaluation'
       LEFT JOIN marks m3 ON m3.student_id = st.id AND m3.subject_id = s.id AND m3.evaluation_type = '3rd Evaluation'
       LEFT JOIN marks m4 ON m4.student_id = st.id AND m4.subject_id = s.id AND m4.evaluation_type = '4th Evaluation'
       LEFT JOIN marks m5 ON m5.student_id = st.id AND m5.subject_id = s.id AND m5.evaluation_type = '5th Evaluation'
       LEFT JOIN marks m6 ON m6.student_id = st.id AND m6.subject_id = s.id AND m6.evaluation_type = '6th Evaluation'
       WHERE c.class_name = $1 AND st.school_id = $2
       ORDER BY st.id, s.id`,
      [className, schoolId],
      schoolId
    );

    const studentMap = {};
    rows.forEach((row) => {
      if (!studentMap[row.student_id]) {
        studentMap[row.student_id] = { totalWeightedScore: 0, totalCoefficient: 0 };
      }
      const t1 = (row.eval1 !== null && row.eval2 !== null) ? (row.eval1 + row.eval2) / 2 : null;
      const t2 = (row.eval3 !== null && row.eval4 !== null) ? (row.eval3 + row.eval4) / 2 : null;
      const t3 = (row.eval5 !== null && row.eval6 !== null) ? (row.eval5 + row.eval6) / 2 : null;
      const valid = [t1, t2, t3].filter((v) => v !== null);
      if (valid.length > 0) {
        const annualAvg = valid.reduce((a, b) => a + b, 0) / valid.length;
        const coeff = parseFloat(row.coefficient);
        studentMap[row.student_id].totalWeightedScore += annualAvg * coeff;
        studentMap[row.student_id].totalCoefficient += coeff;
      }
    });

    return Object.entries(studentMap).map(([id, d]) => ({
      studentId: parseInt(id),
      annualAvg: d.totalCoefficient > 0 ? d.totalWeightedScore / d.totalCoefficient : 0,
    }));
  },
};

module.exports = ReportCardModel;