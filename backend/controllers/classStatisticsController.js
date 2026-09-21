// backend/controllers/classStatisticsController.js
const PDFDocument = require('pdfkit');
const ClassStatisticsModel = require("../models/classStatisticsModel");
const { calculateStudentAverage } = require("../utils/calculations");
const db = require('../config/db');
const { addClassHeader } = require('../utils/classPdfHeader');
const { getSchoolConfig } = require('../services/schoolConfigCache');

const getEvaluationTypesForTerm = (term) => {
  const mapping = {
    'Term 1': ['1st Evaluation', '2nd Evaluation'],
    'Term 2': ['3rd Evaluation', '4th Evaluation'],
    'Term 3': ['5th Evaluation', '6th Evaluation'],
  };
  return mapping[term] || [];
};

const getAllEvaluationTypes = () => [
  '1st Evaluation', '2nd Evaluation', '3rd Evaluation',
  '4th Evaluation', '5th Evaluation', '6th Evaluation',
];

// ==================== PDF GENERATION ====================
const generateClassStatisticsPDF = (statisticsData, metadata, school) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'portrait' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const headerY = addClassHeader(doc, school, `Class Statistics - ${metadata.class_name}`);
      const tableTop = headerY + 20;

      const colPositions = [50, 230, 320, 410, 500];

      doc.rect(45, tableTop - 5, 505, 20).fill('#1a4b8c');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
        .text('SUBJECT', colPositions[0], tableTop)
        .text('AVERAGE', colPositions[1], tableTop)
        .text('PERFORMANCE', colPositions[2], tableTop)
        .text('STUDENTS', colPositions[3], tableTop)
        .text('STATUS', colPositions[4], tableTop);

      let yPosition = tableTop + 25;
      const rowHeight = 18;

      statisticsData.forEach((subject, index) => {
        if (yPosition > 700) {
          doc.addPage();
          const newHeaderY = addClassHeader(doc, school, `Class Statistics - ${metadata.class_name} (continued)`);
          yPosition = newHeaderY + 20;
          doc.rect(45, yPosition - 5, 505, 20).fill('#1a4b8c');
          doc.fontSize(10).font('Helvetica-Bold').fillColor('white')
            .text('SUBJECT', colPositions[0], yPosition)
            .text('AVERAGE', colPositions[1], yPosition)
            .text('PERFORMANCE', colPositions[2], yPosition)
            .text('STUDENTS', colPositions[3], yPosition)
            .text('STATUS', colPositions[4], yPosition);
          yPosition += 25;
        }

        if (index % 2 === 0) {
          doc.rect(45, yPosition - 3, 505, rowHeight).fill('#f8f9fa');
        }

        const avgMark = parseFloat(subject.class_average_mark);
        let status = 'No Data';
        if (avgMark > 0) {
          if (avgMark < 10) status = 'Needs Improvement';
          else if (avgMark < 14) status = 'Satisfactory';
          else if (avgMark < 17) status = 'Good';
          else status = 'Excellent';
        }

        doc.fontSize(9).font('Helvetica').fillColor('#333333')
          .text(subject.subject_name, colPositions[0], yPosition)
          .text(subject.class_average_mark, colPositions[1], yPosition)
          .text(subject.performance_percentage + '%', colPositions[2], yPosition)
          .text(`${subject.students_evaluated_count}/${subject.total_students_in_class}`, colPositions[3], yPosition)
          .text(status, colPositions[4], yPosition);

        yPosition += rowHeight;
      });

      const summaryY = Math.min(yPosition + 30, 750);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
        .text('Summary', 50, summaryY);

      doc.fontSize(9).font('Helvetica').fillColor('#333333')
        .text(`Total Students: ${metadata.total_students}`, 50, summaryY + 20)
        .text(`Subjects Assessed: ${metadata.total_subjects}`, 250, summaryY + 20)
        .text(`Total Marks: ${metadata.relevant_marks}`, 450, summaryY + 20);

      const footerY = 750;
      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(50, footerY).lineTo(545, footerY).stroke();

      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666')
        .text(`Generated on ${new Date().toLocaleDateString()}`, 0, footerY + 10, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ==================== CONTROLLER ====================
const ClassStatisticsController = {
  calculateClassStatistics: async (className, term, academicYear, schoolId, teacherId = null) => {
    try {
      const studentsInClass = await ClassStatisticsModel.getStudentsInClass(className, schoolId);

      if (studentsInClass.length === 0) {
        return {
          statistics: [],
          metadata: {
            class_name: className, term, academic_year: academicYear,
            total_students: 0, total_subjects: 0,
            total_marks_found: 0, relevant_marks: 0, has_data: false,
          },
        };
      }

      let subjectsForClass = [];
      if (teacherId) {
        subjectsForClass = await ClassStatisticsModel.getSubjectsForTeacherAndClass(teacherId, className, schoolId);
      } else {
        subjectsForClass = await ClassStatisticsModel.getAllSubjectsForClass(className, schoolId);
      }

      if (subjectsForClass.length === 0) {
        return {
          statistics: [],
          metadata: {
            class_name: className, term, academic_year: academicYear,
            total_students: studentsInClass.length, total_subjects: 0,
            total_marks_found: 0, relevant_marks: 0, has_data: false,
          },
        };
      }

      const allRawMarks = await ClassStatisticsModel.getAllStudentMarksForClass(className, schoolId);

      const evaluationTypes = (term === 'Year-End' || term === 'All Terms')
        ? getAllEvaluationTypes()
        : getEvaluationTypesForTerm(term);

      const relevantMarks = allRawMarks.filter(mark => evaluationTypes.includes(mark.evaluation_type));

      const structuredMarks = {};
      relevantMarks.forEach((mark) => {
        if (!structuredMarks[mark.student_id]) {
          structuredMarks[mark.student_id] = {
            student_name: mark.student_full_name,
            subjects: {},
          };
        }
        if (!structuredMarks[mark.student_id].subjects[mark.subject_id]) {
          structuredMarks[mark.student_id].subjects[mark.subject_id] = {
            subject_name: mark.subject_name,
            coefficient: mark.coefficient,
            evaluations: {},
          };
        }
        structuredMarks[mark.student_id].subjects[mark.subject_id].evaluations[mark.evaluation_type] = mark.score;
      });

      const statistics = subjectsForClass.map((subject) => {
        let sumOfStudentAverages = 0;
        let studentsEvaluated = 0;

        Object.values(structuredMarks).forEach((studentData) => {
          const subjectData = studentData.subjects[subject.id];
          if (subjectData && Object.keys(subjectData.evaluations).length > 0) {
            const presentEvalTypes = Object.keys(subjectData.evaluations);
            const studentAvg = calculateStudentAverage(
              presentEvalTypes,
              subjectData.evaluations,
              subject.coefficient
            );
            if (studentAvg !== null) {
              sumOfStudentAverages += studentAvg;
              studentsEvaluated++;
            }
          }
        });

        let classAverage = 0;
        let performancePercentage = 0;
        if (studentsEvaluated > 0) {
          classAverage = sumOfStudentAverages / studentsEvaluated;
          performancePercentage = (classAverage / 20) * 100;
        }

        return {
          subject_id: subject.id,
          subject_name: subject.name,
          class_average_mark: classAverage.toFixed(2),
          performance_percentage: performancePercentage.toFixed(2),
          is_below_10_percent: performancePercentage < 10,
          students_evaluated_count: studentsEvaluated,
          total_students_in_class: studentsInClass.length,
        };
      });

      return {
        statistics,
        metadata: {
          class_name: className, term, academic_year: academicYear,
          total_students: studentsInClass.length,
          total_subjects: subjectsForClass.length,
          total_marks_found: allRawMarks.length,
          relevant_marks: relevantMarks.length,
          has_data: relevantMarks.length > 0,
        },
      };
    } catch (error) {
      console.error("Error calculating class statistics:", error);
      throw error;
    }
  },

  getClassPerformanceStatistics: async (req, res) => {
    try {
      const { class_name, term, academic_year } = req.query;
      if (!class_name) return res.status(400).json({ error: "Missing class_name." });

      const result = await ClassStatisticsController.calculateClassStatistics(
        class_name,
        term || 'Year-End',
        academic_year || '2025/2026',
        req.schoolId
      );

      res.status(200).json({ message: "Class statistics retrieved successfully", ...result });
    } catch (error) {
      console.error("Error generating class statistics:", error);
      res.status(500).json({ error: "Failed to retrieve class statistics.", details: error.message });
    }
  },

  downloadClassStatistics: async (req, res) => {
    try {
      const { class_name, term, academic_year } = req.body;
      if (!class_name || !term || !academic_year) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const result = await ClassStatisticsController.calculateClassStatistics(
        class_name, term, academic_year, req.schoolId
      );

      if (result.statistics.length === 0) {
        return res.status(404).json({ error: "No data available" });
      }

      const school = await getSchoolConfig(req.schoolId);
      const pdfBuffer = await generateClassStatisticsPDF(result.statistics, result.metadata, school);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="Class-Statistics-${class_name}-${term}-${academic_year.replace('/', '-')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error in downloadClassStatistics:", error);
      res.status(500).json({ error: "Failed to generate PDF report", details: error.message });
    }
  },

  getTeacherClassStatistics: async (req, res) => {
    try {
      const { class_name, term, academic_year } = req.query;
      const teacherId = req.teacher?.teacherId || req.user?.id;
      const schoolId = req.schoolId;

      if (!teacherId) return res.status(401).json({ error: "Unauthorized: Teacher ID not found." });
      if (!class_name) return res.status(400).json({ error: "Missing class_name." });

      const classResult = await db.tenantQuery(
        'SELECT id FROM classes WHERE LOWER(class_name) = LOWER($1) AND school_id = $2',
        [class_name, schoolId],
        schoolId
      );
      if (classResult.rows.length === 0) return res.status(404).json({ error: "Class not found." });

      const classId = classResult.rows[0].id;

      const assignmentCheck = await db.tenantQuery(
        `SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2 AND school_id = $3`,
        [teacherId, classId, schoolId],
        schoolId
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(403).json({ error: "You are not authorized to view statistics for this class." });
      }

      const result = await ClassStatisticsController.calculateClassStatistics(
        class_name, term || 'Year-End', academic_year || '2025/2026', schoolId, teacherId
      );

      res.status(200).json({ message: "Class statistics retrieved successfully", ...result, teacher_id: teacherId });
    } catch (error) {
      console.error("Error generating teacher class statistics:", error);
      res.status(500).json({ error: "Failed to retrieve class statistics.", details: error.message });
    }
  },

  downloadTeacherClassStatistics: async (req, res) => {
    try {
      const { class_name, term, academic_year } = req.body;
      const teacherId = req.teacher?.teacherId || req.user?.id;
      const schoolId = req.schoolId;

      if (!teacherId) return res.status(401).json({ error: "Unauthorized: Teacher ID not found." });
      if (!class_name || !term || !academic_year) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const classResult = await db.tenantQuery(
        'SELECT id FROM classes WHERE LOWER(class_name) = LOWER($1) AND school_id = $2',
        [class_name, schoolId],
        schoolId
      );
      if (classResult.rows.length === 0) return res.status(404).json({ error: "Class not found." });

      const classId = classResult.rows[0].id;

      const assignmentCheck = await db.tenantQuery(
        `SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2 AND school_id = $3`,
        [teacherId, classId, schoolId],
        schoolId
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(403).json({ error: "You are not authorized to download statistics for this class." });
      }

      const result = await ClassStatisticsController.calculateClassStatistics(
        class_name, term, academic_year, schoolId, teacherId
      );

      if (result.statistics.length === 0) {
        return res.status(404).json({ error: "No data available" });
      }

      const school = await getSchoolConfig(schoolId);
      const pdfBuffer = await generateClassStatisticsPDF(result.statistics, result.metadata, school);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="Class-Statistics-${class_name}-${term}-${academic_year.replace('/', '-')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error in downloadTeacherClassStatistics:", error);
      res.status(500).json({ error: "Failed to generate PDF report", details: error.message });
    }
  },

  getTeacherSubjectsWithClasses: async (req, res) => {
    try {
      const teacher_id = req.teacher?.teacherId || req.user?.id;
      const schoolId = req.schoolId;

      if (!teacher_id) {
        return res.status(401).json({ success: false, error: "Unauthorized: Teacher ID not found." });
      }

      const result = await db.tenantQuery(
        `SELECT DISTINCT
            s.id AS subject_id, s.name AS subject_name,
            c.id AS class_id, c.class_name
         FROM teacher_assignments ta
         JOIN subjects s ON ta.subject_id = s.id
         JOIN classes c ON ta.class_id = c.id
         WHERE ta.teacher_id = $1 AND ta.school_id = $2
         ORDER BY c.class_name, s.name`,
        [teacher_id, schoolId],
        schoolId
      );

      const subjectsMap = {};
      result.rows.forEach((row) => {
        if (!subjectsMap[row.subject_id]) {
          subjectsMap[row.subject_id] = { id: row.subject_id, name: row.subject_name, classes: [] };
        }
        subjectsMap[row.subject_id].classes.push({ id: row.class_id, name: row.class_name });
      });

      res.status(200).json({ success: true, subjects: Object.values(subjectsMap) });
    } catch (err) {
      console.error("Get teacher subjects error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch assigned subjects", details: err.message });
    }
  },

  getAvailableTerms: async (req, res) => {
    const terms = [
      { value: 'Term 1', label: 'Term 1 (Evals 1 & 2)' },
      { value: 'Term 2', label: 'Term 2 (Evals 3 & 4)' },
      { value: 'Term 3', label: 'Term 3 (Evals 5 & 6)' },
      { value: 'Year-End', label: 'Year-End (All Terms)' },
    ];
    res.status(200).json({ success: true, terms });
  },

  getAcademicYears: async (req, res) => {
    const currentYear = new Date().getFullYear();
    const years = [
      `${currentYear - 1}/${currentYear}`,
      `${currentYear}/${currentYear + 1}`,
      `${currentYear + 1}/${currentYear + 2}`,
    ];
    res.status(200).json({ success: true, years });
  },
};

module.exports = ClassStatisticsController;