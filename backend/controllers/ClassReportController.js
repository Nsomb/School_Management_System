// backend/controllers/ClassReportController.js
const ClassReportModel = require('../models/ClassReportModel');
const PDFDocument = require('pdfkit');
const { addClassHeader } = require('../utils/classPdfHeader');
const { getSchoolConfig } = require('../services/schoolConfigCache');

// ==================== Term to Evaluation Type Mapping ====================
const getEvaluationTypesForTerm = (term) => {
  const mapping = {
    'Term 1': ['1st Evaluation', '2nd Evaluation'],
    'Term 2': ['3rd Evaluation', '4th Evaluation'],
    'Term 3': ['5th Evaluation', '6th Evaluation'],
    'Year-End': [
      '1st Evaluation', '2nd Evaluation', '3rd Evaluation',
      '4th Evaluation', '5th Evaluation', '6th Evaluation',
    ],
  };
  const numericMapping = { '1': 'Term 1', '2': 'Term 2', '3': 'Term 3' };
  const resolvedTerm = numericMapping[term] || term;
  return mapping[resolvedTerm] || null;
};

const resolveEvaluationType = (evaluationType, term) => {
  if (/^\d+(?:st|nd|rd|th)?\s+Evaluation$/.test(evaluationType)) {
    return evaluationType;
  }
  const evals = getEvaluationTypesForTerm(term);
  if (!evals) return evaluationType;
  const match = evaluationType.match(/EVA(\d+)/i);
  if (match) {
    const idx = parseInt(match[1]) - 1;
    if (evals[idx]) return evals[idx];
  }
  return evaluationType;
};

// ==================== Helpers ====================

const getCameroonAcademicYear = (providedYear) => {
  if (providedYear && providedYear !== 'N/A') return providedYear;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return currentMonth >= 9
    ? `${currentYear}/${currentYear + 1}`
    : `${currentYear - 1}/${currentYear}`;
};

const buildStudentMarksMatrix = (students, subjects, marksData) => {
  const studentMap = students.map((s) => ({
    student_id: s.id,
    student_name: (s.name || 'UNNAMED').toUpperCase(),
    marksById: {},
  }));

  studentMap.forEach((stu) => {
    subjects.forEach((sub) => {
      stu.marksById[sub.id] = null;
    });
  });

  marksData.forEach((mark) => {
    const student = studentMap.find((s) => s.student_id === mark.student_id);
    if (student && mark.subject_id !== undefined && mark.subject_id !== null) {
      const score = mark.mark_score !== null && mark.mark_score !== undefined
        ? parseFloat(mark.mark_score)
        : null;
      student.marksById[mark.subject_id] = score;
    }
  });

  const finalStudentMap = studentMap.map((stu) => {
    const marksByName = {};
    subjects.forEach((sub) => {
      marksByName[sub.name] = stu.marksById[sub.id] !== undefined ? stu.marksById[sub.id] : null;
    });
    return {
      student_id: stu.student_id,
      student_name: stu.student_name,
      marks: marksByName,
    };
  });

  return finalStudentMap.sort((a, b) => a.student_name.localeCompare(b.student_name));
};

const formatSubjectCode = (subjectName, maxLen = 8) => {
  if (!subjectName) return 'SUBJ';
  const cleanStr = subjectName.trim().toUpperCase();
  if (cleanStr.length <= maxLen) return cleanStr;
  return cleanStr.substring(0, maxLen - 1) + '.';
};

// ==================== PDF Generation ====================

const generateClassReportPDF = (students, subjects, metadata, school) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 25,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const marginX = 25;
      const usableWidth = doc.page.width - 2 * marginX;
      const headerHeight = 95;
      const bottomLimit = doc.page.height - 45;

      const rollColWidth = 22;
      const nameColWidth = 185;
      const fixedTotalWidth = rollColWidth + nameColWidth;
      const remainingWidth = usableWidth - fixedTotalWidth;

      const MIN_SUBJECT_WIDTH = 26;
      const subjectColWidth = Math.max(
        MIN_SUBJECT_WIDTH,
        remainingWidth / Math.max(1, subjects.length)
      );

      const drawRotatedText = (text, cellX, cellY, cellWidth, cellHeight) => {
        doc.save();
        doc.translate(cellX + cellWidth / 2 - 3, cellY + cellHeight - 6);
        doc.rotate(-90);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
        doc.text(text, 0, 0, {
          width: cellHeight - 12,
          align: 'left',
          lineBreak: false,
        });
        doc.restore();
      };

      const drawTableHeader = (startY) => {
        doc.rect(marginX, startY, usableWidth, headerHeight).fillColor('#FFFFFF').fill();
        doc.rect(marginX, startY, usableWidth, headerHeight).strokeColor('#000000').lineWidth(1).stroke();

        let currX = marginX;

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
        doc.text('#', currX + 1, startY + headerHeight - 16, {
          width: rollColWidth - 2, align: 'center',
        });
        doc.moveTo(currX + rollColWidth, startY)
          .lineTo(currX + rollColWidth, startY + headerHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();
        currX += rollColWidth;

        doc.text('STUDENT NAME', currX + 4, startY + headerHeight - 16, {
          width: nameColWidth - 8, align: 'left',
        });
        doc.moveTo(currX + nameColWidth, startY)
          .lineTo(currX + nameColWidth, startY + headerHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();
        currX += nameColWidth;

        subjects.forEach((subj) => {
          const code = formatSubjectCode(subj.name, 8);
          drawRotatedText(code, currX, startY, subjectColWidth, headerHeight);
          doc.moveTo(currX + subjectColWidth, startY)
            .lineTo(currX + subjectColWidth, startY + headerHeight)
            .strokeColor('#000000').lineWidth(0.6).stroke();
          currX += subjectColWidth;
        });

        return startY + headerHeight;
      };

      const headerTitle = `CLASS MARKSHEET - ${metadata.class_name.toUpperCase()} (${metadata.evaluation_type.toUpperCase()})`;
      let y = addClassHeader(doc, school, headerTitle);
      y = drawTableHeader(y + 8);

      students.forEach((student, index) => {
        const rowHeight = 20;

        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          const nextHeaderY = addClassHeader(doc, school, `${headerTitle} (Continuation)`);
          y = drawTableHeader(nextHeaderY + 8);
        }

        if (index % 2 === 0) {
          doc.rect(marginX, y, usableWidth, rowHeight).fillColor('#F7F7F7').fill();
        }

        let xPos = marginX;
        doc.fontSize(8).font('Helvetica').fillColor('#000000');

        doc.text(String(index + 1), xPos + 1, y + rowHeight / 2 - 4, {
          width: rollColWidth - 2, align: 'center', lineBreak: false,
        });
        xPos += rollColWidth;
        doc.moveTo(xPos, y).lineTo(xPos, y + rowHeight)
          .strokeColor('#000000').lineWidth(0.4).stroke();

        doc.font('Helvetica-Bold').text(student.student_name, xPos + 4, y + rowHeight / 2 - 4, {
          width: nameColWidth - 8, lineBreak: false, ellipsis: true,
        });
        xPos += nameColWidth;
        doc.moveTo(xPos, y).lineTo(xPos, y + rowHeight)
          .strokeColor('#000000').lineWidth(0.4).stroke();

        subjects.forEach((subj) => {
          const mark = student.marks[subj.name];
          const markText = mark !== null && mark !== undefined ? String(mark) : '-';

          if (mark !== null && mark !== undefined && mark < 10) {
            doc.font('Helvetica-Bold');
          } else {
            doc.font('Helvetica');
          }

          doc.text(markText, xPos, y + rowHeight / 2 - 4, {
            width: subjectColWidth, align: 'center', lineBreak: false,
          });
          xPos += subjectColWidth;
          doc.moveTo(xPos, y).lineTo(xPos, y + rowHeight)
            .strokeColor('#000000').lineWidth(0.4).stroke();
        });

        doc.moveTo(marginX, y + rowHeight)
          .lineTo(marginX + usableWidth, y + rowHeight)
          .strokeColor('#000000').lineWidth(0.4).stroke();

        y += rowHeight;
      });

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        doc.strokeColor('#000000').lineWidth(0.6)
          .moveTo(marginX, doc.page.height - 38)
          .lineTo(marginX + usableWidth, doc.page.height - 38)
          .stroke();

        doc.fontSize(7.5).font('Helvetica-BoldOblique').fillColor('#000000')
          .text(
            `Class: ${metadata.class_name}  •  Term: ${metadata.term}  •  Academic Year: ${metadata.academic_year}  •  Students: ${metadata.total_students}`,
            marginX, doc.page.height - 30,
            { width: usableWidth / 2, align: 'left' }
          );

        doc.text(
          `Page ${i + 1} of ${range.count}`,
          marginX + usableWidth / 2, doc.page.height - 30,
          { width: usableWidth / 2, align: 'right' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ==================== Exported Controllers ====================

exports.getClassReport = async (req, res) => {
  try {
    let className = req.query.className || req.query.class_name;
    let evaluationType = req.query.evaluationType || req.query.evaluation_type;
    let term = req.query.term || 'N/A';
    const academicYear = getCameroonAcademicYear(req.query.academicYear || req.query.academic_year);
    const schoolId = req.schoolId;

    if (term !== 'N/A' && evaluationType) {
      evaluationType = resolveEvaluationType(evaluationType, term);
    }

    if (!className || !evaluationType) {
      return res.status(400).json({
        error: 'Missing required parameters: className and evaluationType are required.',
      });
    }

    const students = await ClassReportModel.getStudentsInClass(className, schoolId);
    const subjects = await ClassReportModel.getSubjectsForClass(className, schoolId);
    const marksData = await ClassReportModel.getClassEvaluationMarks(className, evaluationType, schoolId);

    const studentMap = buildStudentMarksMatrix(students, subjects, marksData);

    return res.status(200).json({
      students: studentMap,
      subjects,
      metadata: {
        class_name: className,
        evaluation_type: evaluationType,
        total_students: students.length,
        total_subjects: subjects.length,
        total_marks_found: marksData.length,
        term,
        academic_year: academicYear,
      },
    });
  } catch (error) {
    console.error('Error generating class report JSON:', error);
    return res.status(500).json({
      error: 'Failed to generate class report.',
      details: error.message,
    });
  }
};

exports.downloadClassReport = async (req, res) => {
  try {
    let className = req.query.className || req.query.class_name;
    let evaluationType = req.query.evaluationType || req.query.evaluation_type;
    let term = req.query.term || 'N/A';
    const academicYear = getCameroonAcademicYear(req.query.academicYear || req.query.academic_year);
    const schoolId = req.schoolId;

    if (term !== 'N/A' && evaluationType) {
      evaluationType = resolveEvaluationType(evaluationType, term);
    }

    if (!className || !evaluationType) {
      return res.status(400).json({
        error: 'Missing required parameters: className and evaluationType are required.',
      });
    }

    const students = await ClassReportModel.getStudentsInClass(className, schoolId);
    const subjects = await ClassReportModel.getSubjectsForClass(className, schoolId);
    const marksData = await ClassReportModel.getClassEvaluationMarks(className, evaluationType, schoolId);

    if (!students || students.length === 0) {
      return res.status(404).json({ error: 'No students found for this class.' });
    }
    if (!subjects || subjects.length === 0) {
      return res.status(404).json({ error: 'No subjects found for this class.' });
    }

    const studentMap = buildStudentMarksMatrix(students, subjects, marksData);

    const metadata = {
      class_name: className,
      evaluation_type: evaluationType,
      term,
      academic_year: academicYear,
      total_students: students.length,
      total_subjects: subjects.length,
    };

    const school = await getSchoolConfig(schoolId);
    const pdfBuffer = await generateClassReportPDF(studentMap, subjects, metadata, school);

    const safeFileName = `Marksheet_${className}_${evaluationType}_${academicYear.replace('/', '-')}.pdf`.replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading class report PDF:', error);
    return res.status(500).json({
      error: 'Failed to generate PDF document.',
      details: error.message,
    });
  }
};