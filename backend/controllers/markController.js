// backend/controllers/MarkController.js
const MarkModel = require("../models/markModel");
const CompetencyModel = require("../models/competencyModel");
const db = require("../config/db");

const getSchoolId = (req) =>
  req.schoolId || req.teacher?.schoolId || req.user?.schoolId || null;

const getEvaluationTypesForTerm = (termType) => {
  const mapping = {
    'Term 1': ['1st Evaluation', '2nd Evaluation'],
    'Term 2': ['3rd Evaluation', '4th Evaluation'],
    'Term 3': ['5th Evaluation', '6th Evaluation'],
  };
  return mapping[termType] || [];
};

const validateScore = (score) => {
  if (score === undefined || score === null || score === '') return false;
  const numScore = parseFloat(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 20;
};

const MarkController = {
  getTeacherSubjects: async (req, res) => {
    try {
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = getSchoolId(req);

      if (!teacher_id) return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });

      const result = await db.tenantQuery(
        `SELECT DISTINCT
            s.id as subject_id, s.name as subject_name,
            c.id as class_id, c.class_name
         FROM teacher_assignments ta
         JOIN subjects s ON ta.subject_id = s.id
         JOIN classes c ON ta.class_id = c.id
         WHERE ta.teacher_id = $1 AND ta.school_id = $2
         ORDER BY c.class_name, s.name`,
        [teacher_id, schoolId],
        schoolId
      );

      const subjectsMap = {};
      result.rows.forEach(row => {
        if (!subjectsMap[row.subject_id]) {
          subjectsMap[row.subject_id] = {
            id: row.subject_id,
            name: row.subject_name,
            classes: [],
          };
        }
        subjectsMap[row.subject_id].classes.push({
          id: row.class_id,
          name: row.class_name,
        });
      });

      res.status(200).json({ success: true, subjects: Object.values(subjectsMap) });
    } catch (err) {
      console.error("Get teacher subjects error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch assigned subjects", details: err.message });
    }
  },

  getAvailableEvaluations: async (req, res) => {
    const evaluations = [
      { value: '1st Evaluation', label: '1st Evaluation', term: 'Term 1' },
      { value: '2nd Evaluation', label: '2nd Evaluation', term: 'Term 1' },
      { value: '3rd Evaluation', label: '3rd Evaluation', term: 'Term 2' },
      { value: '4th Evaluation', label: '4th Evaluation', term: 'Term 2' },
      { value: '5th Evaluation', label: '5th Evaluation', term: 'Term 3' },
      { value: '6th Evaluation', label: '6th Evaluation', term: 'Term 3' },
    ];
    res.status(200).json({ success: true, evaluations });
  },

  getEvaluationMarks: async (req, res) => {
    try {
      const { subjectId, classId, evaluationType } = req.query;
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = getSchoolId(req);

      if (!teacher_id) return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });
      if (!subjectId || !classId || !evaluationType) {
        return res.status(400).json({ success: false, error: "Missing required parameters" });
      }

      const isAssigned = await MarkModel.isTeacherAssigned(teacher_id, subjectId, classId, schoolId);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: "You are not authorized for this subject and class" });
      }

      const existingMarks = await MarkModel.getMarksByEvaluation(teacher_id, subjectId, classId, evaluationType, schoolId);
      const students = await MarkModel.getStudentsByClass(classId, schoolId);

      const marksMap = {};
      existingMarks.forEach(mark => {
        marksMap[mark.student_id] = {
          score: mark.score,
          mark_id: mark.id,
          is_exempt: mark.is_exempt || false,
        };
      });

      const marksData = students.map(student => ({
        student_id: student.id,
        student_name: student.name,
        score: marksMap[student.id]?.score ?? null,
        mark_id: marksMap[student.id]?.mark_id ?? null,
        is_exempt: marksMap[student.id]?.is_exempt ?? false,
      }));

      const competency = await CompetencyModel.getCompetency(subjectId, classId, evaluationType, schoolId);

      res.status(200).json({
        success: true,
        evaluation_type: evaluationType,
        competency: competency?.competency || null,
        marks: marksData,
        total_students: students.length,
        existing_count: existingMarks.length,
      });
    } catch (err) {
      console.error("Get evaluation marks error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch marks" });
    }
  },

  getCompetency: async (req, res) => {
    try {
      const { subjectId, classId, evaluationType } = req.query;
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = getSchoolId(req);

      if (!teacher_id) return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });
      if (!subjectId || !classId || !evaluationType) {
        return res.status(400).json({ success: false, error: "Missing required parameters: subjectId, classId, evaluationType" });
      }

      const isAssigned = await MarkModel.isTeacherAssigned(teacher_id, subjectId, classId, schoolId);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: "You are not authorized for this subject and class" });
      }

      const competency = await CompetencyModel.getCompetency(subjectId, classId, evaluationType, schoolId);
      res.status(200).json({ success: true, competency: competency?.competency || null });
    } catch (err) {
      console.error("Get competency error:", err);
      res.status(500).json({ success: false, error: "Failed to load competency" });
    }
  },

  // ═══════════════════════════════════════════════════════
  // SUBMIT SINGLE EVALUATION — now supports exempt
  // ═══════════════════════════════════════════════════════
  submitSingleEvaluation: async (req, res) => {
    try {
      const { subject_id, class_id, evaluation_type, competency, marks } = req.body;
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = getSchoolId(req);

      if (!teacher_id) return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });
      if (!subject_id || !class_id || !evaluation_type) {
        return res.status(400).json({ success: false, error: "Missing required fields: subject_id, class_id, evaluation_type" });
      }
      if (!marks || !Array.isArray(marks) || marks.length === 0) {
        return res.status(400).json({ success: false, error: "At least one entry is required" });
      }

      const isAssigned = await MarkModel.isTeacherAssigned(teacher_id, subject_id, class_id, schoolId);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: "You are not authorized for this subject and class" });
      }

      if (competency && competency.trim()) {
        await CompetencyModel.createOrUpdate({
          teacher_id, subject_id, class_id, evaluation_type,
          competency: competency.trim(),
        }, schoolId);
      }

      const savedMarks = [];
      const errors = [];

      for (const mark of marks) {
        try {
          if (!mark.student_id) {
            errors.push(`Missing student_id for a mark`);
            continue;
          }

          const isExempt = mark.is_exempt === true;

          // Non-exempt entries must have a valid score
          if (!isExempt && !validateScore(mark.score)) {
            errors.push(`Student ${mark.student_id}: Score must be between 0-20`);
            continue;
          }

          const result = await MarkModel.upsert({
            student_id: mark.student_id,
            subject_id,
            teacher_id,
            evaluation_type,
            score: isExempt ? null : parseFloat(mark.score),
            is_exempt: isExempt,
          }, schoolId);
          savedMarks.push(result);
        } catch (err) {
          if (err.code === '23503') errors.push(`Student ${mark.student_id}: Invalid student ID`);
          else if (err.code === '23505') errors.push(`Student ${mark.student_id}: Duplicate mark`);
          else errors.push(`Student ${mark.student_id}: ${err.message}`);
        }
      }

      res.status(200).json({
        success: true,
        message: `Saved ${savedMarks.length} entries for ${evaluation_type}`,
        marks_count: savedMarks.length,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        marks: savedMarks,
      });
    } catch (err) {
      console.error("Submit single evaluation error:", err);
      res.status(500).json({ success: false, error: "Server error occurred while saving marks" });
    }
  },

  getTermMarks: async (req, res) => {
    try {
      const { subject_id, class_id, term_type } = req.query;
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = getSchoolId(req);

      if (!teacher_id) return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });
      if (!subject_id || !class_id || !term_type) {
        return res.status(400).json({ success: false, error: "Missing required parameters" });
      }

      const isAssigned = await MarkModel.isTeacherAssigned(teacher_id, subject_id, class_id, schoolId);
      if (!isAssigned) return res.status(403).json({ success: false, error: "You are not authorized" });

      const evaluationTypes = getEvaluationTypesForTerm(term_type);
      if (evaluationTypes.length === 0) {
        return res.status(400).json({ success: false, error: `Invalid term type: ${term_type}` });
      }

      const termMarks = await MarkModel.getMarksByEvaluationTypes(
        teacher_id, subject_id, class_id, evaluationTypes, schoolId
      );
      const students = await MarkModel.getStudentsByClass(class_id, schoolId);

      const marksMap = {};
      termMarks.forEach(mark => {
        if (!marksMap[mark.student_id]) marksMap[mark.student_id] = {};
        marksMap[mark.student_id][mark.evaluation_type] = {
          score: mark.score,
          mark_id: mark.id,
          is_exempt: mark.is_exempt || false,
        };
      });

      const marksData = students.map(student => {
        const studentMarks = marksMap[student.id] || {};
        const result = { student_id: student.id, student_name: student.name };
        evaluationTypes.forEach((evalType, index) => {
          const entry = studentMarks[evalType];
          result[`evaluation${index + 1}_score`] = entry?.score ?? null;
          result[`evaluation${index + 1}_id`] = entry?.mark_id ?? null;
          result[`evaluation${index + 1}_is_exempt`] = entry?.is_exempt ?? false;
        });
        return result;
      });

      res.status(200).json({
        success: true,
        term: term_type,
        evaluation_types: evaluationTypes,
        marks: marksData,
        total_students: students.length,
      });
    } catch (err) {
      console.error("Get term marks error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch term marks" });
    }
  },

  // ═══════════════════════════════════════════════════════
  // SUBMIT TERM MARKS — now supports exempt
  // ═══════════════════════════════════════════════════════
  submitTermMarks: async (req, res) => {
    try {
      const { subject_id, class_id, term_type, competency1, competency2, marks } = req.body;
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = getSchoolId(req);

      if (!teacher_id) return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });
      if (!subject_id || !class_id || !term_type) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      if (!marks || !Array.isArray(marks) || marks.length === 0) {
        return res.status(400).json({ success: false, error: "At least one entry is required" });
      }

      const isAssigned = await MarkModel.isTeacherAssigned(teacher_id, subject_id, class_id, schoolId);
      if (!isAssigned) return res.status(403).json({ success: false, error: "You are not authorized for this subject and class" });

      const evaluationTypes = getEvaluationTypesForTerm(term_type);
      if (evaluationTypes.length !== 2) {
        return res.status(400).json({ success: false, error: `Invalid term type: ${term_type}` });
      }

      if (competency1 && competency1.trim()) {
        await CompetencyModel.createOrUpdate({
          teacher_id, subject_id, class_id,
          evaluation_type: evaluationTypes[0],
          competency: competency1.trim(),
        }, schoolId);
      }
      if (competency2 && competency2.trim()) {
        await CompetencyModel.createOrUpdate({
          teacher_id, subject_id, class_id,
          evaluation_type: evaluationTypes[1],
          competency: competency2.trim(),
        }, schoolId);
      }

      const savedMarks = [];
      const errors = [];

      for (const mark of marks) {
        try {
          if (!mark.student_id) { errors.push(`Missing student_id for a mark`); continue; }

          const isExempt = mark.is_exempt === true;

          if (isExempt) {
            // Save exempt for BOTH evaluations
            const r1 = await MarkModel.upsert({
              student_id: mark.student_id,
              subject_id, teacher_id,
              evaluation_type: evaluationTypes[0],
              score: null,
              is_exempt: true,
            }, schoolId);
            savedMarks.push(r1);

            const r2 = await MarkModel.upsert({
              student_id: mark.student_id,
              subject_id, teacher_id,
              evaluation_type: evaluationTypes[1],
              score: null,
              is_exempt: true,
            }, schoolId);
            savedMarks.push(r2);
            continue;
          }

          // Not exempt — save each evaluation
          if (mark.evaluation1_score !== undefined && mark.evaluation1_score !== null) {
            if (!validateScore(mark.evaluation1_score)) {
              errors.push(`Student ${mark.student_id}: Eval 1 score must be 0-20`);
            } else {
              const r1 = await MarkModel.upsert({
                student_id: mark.student_id,
                subject_id, teacher_id,
                evaluation_type: evaluationTypes[0],
                score: parseFloat(mark.evaluation1_score),
                is_exempt: false,
              }, schoolId);
              savedMarks.push(r1);
            }
          }

          if (mark.evaluation2_score !== undefined && mark.evaluation2_score !== null) {
            if (!validateScore(mark.evaluation2_score)) {
              errors.push(`Student ${mark.student_id}: Eval 2 score must be 0-20`);
            } else {
              const r2 = await MarkModel.upsert({
                student_id: mark.student_id,
                subject_id, teacher_id,
                evaluation_type: evaluationTypes[1],
                score: parseFloat(mark.evaluation2_score),
                is_exempt: false,
              }, schoolId);
              savedMarks.push(r2);
            }
          }
        } catch (err) {
          errors.push(`Student ${mark.student_id}: ${err.message}`);
        }
      }

      res.status(200).json({
        success: true,
        message: `Saved ${savedMarks.length} entries for ${term_type}`,
        marks_count: savedMarks.length,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        marks: savedMarks,
      });
    } catch (err) {
      console.error("Submit term marks error:", err);
      res.status(500).json({ success: false, error: "Failed to save term marks" });
    }
  },

  submitMarksBatch: async (req, res) => {
    return MarkController.submitSingleEvaluation(req, res);
  },

  getExistingMarks: async (req, res) => {
    return MarkController.getEvaluationMarks(req, res);
  },

  getMyMarks: async (req, res) => {
    try {
      const student_id = req.user?.id || req.student?.id;
      const schoolId = getSchoolId(req);
      if (!student_id) return res.status(401).json({ success: false, error: "Unauthorized: Student ID not found." });
      if (!schoolId) return res.status(403).json({ success: false, error: "No school context." });
      const marks = await MarkModel.getStudentMarks(student_id, schoolId);
      res.status(200).json({ success: true, marks });
    } catch (err) {
      console.error("Get my marks error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch marks" });
    }
  },
};

module.exports = MarkController;