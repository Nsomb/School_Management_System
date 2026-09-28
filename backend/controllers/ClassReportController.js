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
    const idx = parseInt(match[1], 10) - 1;
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

/**
 * Build student × subject matrix.
 *
 *  - Subject columns keep RAW marks (as entered by the teacher).
 *  - TOTAL = Σ(mark × coefficient)   — weighted points (matches report card).
 *  - AVG   = TOTAL / Σ(coefficient)  — weighted average /20 (matches report card).
 *  - RANK  = competition rank by AVG (1, 2, 2, 4, …) — matches report card.
 */
const buildStudentMarksMatrix = (students, subjects, marksData) => {
  const studentMap = students.map((s) => ({
    student_id: s.id,
    student_name: (s.name || 'UNNAMED').toUpperCase(),
    marksById: {},
  }));

  studentMap.forEach((stu) => {
    subjects.forEach((sub) => { stu.marksById[sub.id] = null; });
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

  const withTotals = studentMap.map((stu) => {
    const marksByName = {};
    let total = 0;
    let totalCoef = 0;

    subjects.forEach((sub) => {
      const mark = stu.marksById[sub.id];
      marksByName[sub.name] = mark;

      if (mark !== null && mark !== undefined && !isNaN(mark)) {
        const coef = parseFloat(sub.coefficient) || 1;
        total += mark * coef;
        totalCoef += coef;
      }
    });

    const avg = totalCoef > 0 ? total / totalCoef : 0;

    return {
      student_id: stu.student_id,
      student_name: stu.student_name,
      marks: marksByName,
      total: Math.round(total * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      totalCoef,
    };
  });

  // competition rank by AVG (4-decimal rounding to avoid float ties)
  const sorted = [...withTotals].sort((a, b) => {
    const aAvg = Number(parseFloat(a.avg || 0).toFixed(4));
    const bAvg = Number(parseFloat(b.avg || 0).toFixed(4));
    return bAvg - aAvg;
  });

  const rankMap = {};
  let currentRank = 1;
  let previousAvg = null;
  sorted.forEach((s, idx) => {
    const thisAvg = Number(parseFloat(s.avg || 0).toFixed(4));
    if (previousAvg !== null && thisAvg !== previousAvg) {
      currentRank = idx + 1;
    }
    rankMap[s.student_id] = currentRank;
    previousAvg = thisAvg;
  });

  withTotals.forEach((s) => { s.rank = rankMap[s.student_id]; });

  return withTotals.sort((a, b) => a.student_name.localeCompare(b.student_name));
};

// Show the coefficient in the header so it's clear why TOTAL ≠ plain sum
const formatSubjectCode = (subjectName, coefficient, maxLen = 10) => {
  if (!subjectName) return 'SUBJ';
  const clean = subjectName.trim().toUpperCase();
  const coefLabel = coefficient ? `(${coefficient})` : '';
  const available = Math.max(3, maxLen - coefLabel.length);
  let abbr = clean;
  if (clean.length > available) abbr = clean.substring(0, available - 1) + '.';
  return `${abbr}${coefLabel}`;
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
      const headerHeight = 105;
      const bottomLimit = doc.page.height - 45;

      const rollColWidth = 22;
      const nameColWidth = 155;
      const totalColWidth = 52;
      const avgColWidth = 42;
      const rankColWidth = 34;
      const fixedTotalWidth =
        rollColWidth + nameColWidth + totalColWidth + avgColWidth + rankColWidth;

      const remainingWidth = usableWidth - fixedTotalWidth;
      const MIN_SUBJECT_WIDTH = 26;
      const subjectColWidth = Math.max(
        MIN_SUBJECT_WIDTH,
        remainingWidth / Math.max(1, subjects.length)
      );

      const drawRotatedText = (text, cellX, cellY, cellWidth, cellHeight) => {
        doc.save();
        doc.translate(cellX + cellWidth / 2 - 4, cellY + cellHeight - 6);
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
        doc.rect(marginX, startY, usableWidth, headerHeight)
          .fillColor('#FFFFFF').fill();
        doc.rect(marginX, startY, usableWidth, headerHeight)
          .strokeColor('#000000').lineWidth(1).stroke();

        let currX = marginX;

        // #
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
        doc.text('#', currX + 1, startY + headerHeight - 16, {
          width: rollColWidth - 2, align: 'center',
        });
        currX += rollColWidth;
        doc.moveTo(currX, startY).lineTo(currX, startY + headerHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();

        // STUDENT NAME
        doc.text('STUDENT NAME', currX + 4, startY + headerHeight - 16, {
          width: nameColWidth - 8, align: 'left',
        });
        currX += nameColWidth;
        doc.moveTo(currX, startY).lineTo(currX, startY + headerHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();

        // SUBJECTS — with coefficient in parentheses
        subjects.forEach((subj) => {
          const code = formatSubjectCode(subj.name, subj.coefficient);
          drawRotatedText(code, currX, startY, subjectColWidth, headerHeight);
          currX += subjectColWidth;
          doc.moveTo(currX, startY).lineTo(currX, startY + headerHeight)
            .strokeColor('#000000').lineWidth(0.6).stroke();
        });

        // TOTAL
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
        doc.text('TOTAL', currX + 1, startY + headerHeight - 16, {
          width: totalColWidth - 2, align: 'center',
        });
        currX += totalColWidth;
        doc.moveTo(currX, startY).lineTo(currX, startY + headerHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();

        // AVG
        doc.text('AVG', currX + 1, startY + headerHeight - 16, {
          width: avgColWidth - 2, align: 'center',
        });
        currX += avgColWidth;
        doc.moveTo(currX, startY).lineTo(currX, startY + headerHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();

        // RANK
        doc.text('RANK', currX + 1, startY + headerHeight - 16, {
          width: rankColWidth - 2, align: 'center',
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

        doc.rect(marginX, y, usableWidth, rowHeight)
          .strokeColor('#000000').lineWidth(0.6).stroke();

        let xPos = marginX;
        doc.fontSize(8).font('Helvetica').fillColor('#000000');

        doc.text(String(index + 1), xPos + 1, y + rowHeight / 2 - 4, {
          width: rollColWidth - 2, align: 'center', lineBreak: false,
        });
        xPos += rollColWidth;

        doc.font('Helvetica-Bold').text(student.student_name, xPos + 4, y + rowHeight / 2 - 4, {
          width: nameColWidth - 8, lineBreak: false, ellipsis: true,
        });
        xPos += nameColWidth;

        // SUBJECT MARKS — RAW values, as entered
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
        });

        // TOTAL — weighted
        doc.font('Helvetica-Bold').text(
          student.total != null ? student.total.toFixed(2) : '-',
          xPos, y + rowHeight / 2 - 4,
          { width: totalColWidth, align: 'center', lineBreak: false }
        );
        xPos += totalColWidth;

        // AVG — weighted
        doc.font('Helvetica-Bold').text(
          student.avg != null ? student.avg.toFixed(2) : '-',
          xPos, y + rowHeight / 2 - 4,
          { width: avgColWidth, align: 'center', lineBreak: false }
        );
        xPos += avgColWidth;

        // RANK
        doc.font('Helvetica-Bold').text(
          String(student.rank || '-'),
          xPos, y + rowHeight / 2 - 4,
          { width: rankColWidth, align: 'center', lineBreak: false }
        );

        // Vertical grid lines
        let vx = marginX + rollColWidth;
        doc.moveTo(vx, y).lineTo(vx, y + rowHeight).strokeColor('#000000').lineWidth(0.6).stroke();

        vx += nameColWidth;
        doc.moveTo(vx, y).lineTo(vx, y + rowHeight).strokeColor('#000000').lineWidth(0.6).stroke();

        subjects.forEach(() => {
          vx += subjectColWidth;
          doc.moveTo(vx, y).lineTo(vx, y + rowHeight).strokeColor('#000000').lineWidth(0.6).stroke();
        });

        vx += totalColWidth;
        doc.moveTo(vx, y).lineTo(vx, y + rowHeight).strokeColor('#000000').lineWidth(0.6).stroke();

        vx += avgColWidth;
        doc.moveTo(vx, y).lineTo(vx, y + rowHeight).strokeColor('#000000').lineWidth(0.6).stroke();

        y += rowHeight;
      });

      // Page footers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

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

// ==================== Controllers ====================
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