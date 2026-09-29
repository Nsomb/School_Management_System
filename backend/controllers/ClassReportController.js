// backend/controllers/ClassReportController.js
const ClassReportModel = require('../models/ClassReportModel');
const PDFDocument = require('pdfkit');
const { addClassHeader } = require('../utils/classPdfHeader');
const { getSchoolConfig } = require('../services/schoolConfigCache');

// ==================== Subject Abbreviations ====================
const SUBJECT_ABBREVIATIONS = {
  'mathematics': 'MATH', 'maths': 'MATH', 'math': 'MATH',
  'further mathematics': 'F.MATH', 'further maths': 'F.MATH',
  'english language': 'ENG', 'english': 'ENG',
  'french language': 'FRE', 'french': 'FRE',
  'physics': 'PHY',
  'chemistry': 'CHEM',
  'biology': 'BIO',
  'human biology': 'H.BIO',
  'geography': 'GEO',
  'history': 'HIS',
  'economics': 'ECO',
  'citizenship': 'CIT', 'citizenship education': 'CIT',
  'philosophy': 'PHILO',
  'computer science': 'CSC',
  'information and communications technology': 'ICT',
  'information & communication technology': 'ICT',
  'ict': 'ICT',
  'literature': 'LIT', 'literature in english': 'LIT',
  'physical education': 'PE',
  'geology': 'GEOL',
  'logic': 'LOG',
  'religious studies': 'R.S',
  'science': 'SCI',
};

const abbreviateSubject = (name) => {
  if (!name) return 'SUBJ';
  const lower = name.trim().toLowerCase();
  if (SUBJECT_ABBREVIATIONS[lower]) return SUBJECT_ABBREVIATIONS[lower];
  const clean = name.trim().toUpperCase();
  if (clean.length <= 5) return clean;
  return clean.substring(0, 4) + '.';
};

const HORIZONTAL_HEADER_THRESHOLD = 10;

// ==================== Term → Evaluation Type ====================
const getEvaluationTypesForTerm = (term) => {
  const mapping = {
    'Term 1': ['1st Evaluation', '2nd Evaluation'],
    'Term 2': ['3rd Evaluation', '4th Evaluation'],
    'Term 3': ['5th Evaluation', '6th Evaluation'],
    'Year-End': ['1st Evaluation', '2nd Evaluation', '3rd Evaluation', '4th Evaluation', '5th Evaluation', '6th Evaluation'],
  };
  const numericMapping = { '1': 'Term 1', '2': 'Term 2', '3': 'Term 3' };
  return mapping[numericMapping[term] || term] || null;
};

const resolveEvaluationType = (evaluationType, term) => {
  if (/^\d+(?:st|nd|rd|th)?\s+Evaluation$/.test(evaluationType)) return evaluationType;
  const evals = getEvaluationTypesForTerm(term);
  if (!evals) return evaluationType;
  const match = evaluationType.match(/EVA(\d+)/i);
  if (match) {
    const idx = parseInt(match[1], 10) - 1;
    if (evals[idx]) return evals[idx];
  }
  return evaluationType;
};

const getCameroonAcademicYear = (providedYear) => {
  if (providedYear && providedYear !== 'N/A') return providedYear;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};

// ==================== Matrix Builder ====================
/**
 * Each cell in `marksById` becomes an object: { score, isExempt }.
 *   - isExempt = true → cell renders as "EX", excluded from TOTAL/AVG
 *   - score is a number → renders as the mark
 *   - otherwise (no row found) → renders as blank (empty)
 */
const buildStudentMarksMatrix = (students, subjects, marksData) => {
  const studentMap = students.map((s) => ({
    student_id: s.id,
    student_name: (s.name || 'UNNAMED').toUpperCase(),
    marksById: {},
  }));

  // Default: no entry (blank cell)
  studentMap.forEach((stu) => {
    subjects.forEach((sub) => { stu.marksById[sub.id] = null; });
  });

  marksData.forEach((mark) => {
    const student = studentMap.find((s) => s.student_id === mark.student_id);
    if (student && mark.subject_id !== undefined && mark.subject_id !== null) {
      student.marksById[mark.subject_id] = {
        score: mark.mark_score !== null && mark.mark_score !== undefined
          ? parseFloat(mark.mark_score)
          : null,
        isExempt: mark.is_exempt === true,
      };
    }
  });

  const withTotals = studentMap.map((stu) => {
    const marksByName = {};
    let total = 0;
    let totalCoef = 0;

    subjects.forEach((sub) => {
      const cell = stu.marksById[sub.id];
      marksByName[sub.name] = cell;

      // Skip exempt and empty cells from TOTAL / AVG
      if (cell && !cell.isExempt && cell.score !== null && !isNaN(cell.score)) {
        const coef = parseFloat(sub.coefficient) || 1;
        total += cell.score * coef;
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

  const sorted = [...withTotals].sort((a, b) =>
    Number(parseFloat(b.avg || 0).toFixed(4)) - Number(parseFloat(a.avg || 0).toFixed(4))
  );

  const rankMap = {};
  let currentRank = 1;
  let previousAvg = null;
  sorted.forEach((s, idx) => {
    const thisAvg = Number(parseFloat(s.avg || 0).toFixed(4));
    if (previousAvg !== null && thisAvg !== previousAvg) currentRank = idx + 1;
    rankMap[s.student_id] = currentRank;
    previousAvg = thisAvg;
  });

  withTotals.forEach((s) => { s.rank = rankMap[s.student_id]; });
  return withTotals.sort((a, b) => a.student_name.localeCompare(b.student_name));
};

// Returns what to draw in a marksheet cell — "EX", a number, or ""
const renderCellText = (cell) => {
  if (!cell) return '';
  if (cell.isExempt) return 'EX';
  if (cell.score !== null && cell.score !== undefined && !isNaN(cell.score)) {
    return String(cell.score);
  }
  return '';
};

// ==================== PDF ====================
const generateClassReportPDF = (students, subjects, metadata, school) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'portrait', bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const marginX = 25;
      const usableWidth = doc.page.width - 2 * marginX;
      const useHorizontalHeaders = subjects.length <= HORIZONTAL_HEADER_THRESHOLD;
      const headerHeight = useHorizontalHeaders ? 36 : 105;
      const rowHeight = 20;
      const bottomLimit = doc.page.height - 45;

      const rollColWidth  = 20;
      const totalColWidth = 44;
      const avgColWidth   = 38;
      const rankColWidth  = 30;
      const fixedExcludingName = rollColWidth + totalColWidth + avgColWidth + rankColWidth;

      const NAME_COL_START = 130;
      const NAME_COL_MIN   = 80;

      const SUBJECT_HORIZ_MIN = 32;
      const SUBJECT_HORIZ_MAX = 54;
      const SUBJECT_VERT_MIN  = 14;
      const SUBJECT_VERT_MAX  = 22;

      let nameColWidth = NAME_COL_START;
      let remaining = usableWidth - fixedExcludingName - nameColWidth;
      let ideal = remaining / Math.max(1, subjects.length);

      const minSubjectCol = useHorizontalHeaders ? SUBJECT_HORIZ_MIN : SUBJECT_VERT_MIN;

      if (ideal < minSubjectCol) {
        const deficit = (minSubjectCol - ideal) * subjects.length;
        nameColWidth = Math.max(NAME_COL_MIN, nameColWidth - deficit);
        remaining = usableWidth - fixedExcludingName - nameColWidth;
        ideal = remaining / Math.max(1, subjects.length);
      }

      const subjectColWidth = useHorizontalHeaders
        ? Math.min(SUBJECT_HORIZ_MAX, Math.max(SUBJECT_HORIZ_MIN, ideal))
        : Math.min(SUBJECT_VERT_MAX,  Math.max(SUBJECT_VERT_MIN,  ideal));

      const tableWidth = fixedExcludingName + nameColWidth + subjects.length * subjectColWidth;

      const xs = { roll: marginX, name: marginX + rollColWidth };
      xs.subjects = [];
      let cursor = xs.name + nameColWidth;
      subjects.forEach(() => { xs.subjects.push(cursor); cursor += subjectColWidth; });
      xs.total = cursor;
      xs.avg = xs.total + totalColWidth;
      xs.rank = xs.avg + avgColWidth;

      const drawRowGrid = (y, h) => {
        doc.strokeColor('#000000').lineWidth(0.7);
        doc.rect(marginX, y, tableWidth, h).stroke();
        const verticals = [
          xs.roll + rollColWidth,
          xs.name + nameColWidth,
          ...xs.subjects.map((sx) => sx + subjectColWidth),
          xs.total + totalColWidth,
          xs.avg + avgColWidth,
        ];
        verticals.forEach((vx) => doc.moveTo(vx, y).lineTo(vx, y + h).stroke());
      };

      const drawTableHeader = (startY) => {
        doc.rect(marginX, startY, tableWidth, headerHeight).fillColor('#FFFFFF').fill();
        doc.fillColor('#000000');

        if (useHorizontalHeaders) {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
          doc.text('#', xs.roll, startY + headerHeight / 2 - 4, { width: rollColWidth, align: 'center' });
          doc.text('STUDENT NAME', xs.name + 4, startY + headerHeight / 2 - 4, {
            width: nameColWidth - 8, align: 'left',
          });

          subjects.forEach((subj, idx) => {
            const sx = xs.subjects[idx];
            const abbr = abbreviateSubject(subj.name);
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
            doc.text(abbr, sx, startY + 5, { width: subjectColWidth, align: 'center', lineBreak: false });
            if (subj.coefficient != null) {
              doc.fontSize(6).font('Helvetica').fillColor('#555555');
              doc.text(`(${subj.coefficient})`, sx, startY + 20, {
                width: subjectColWidth, align: 'center', lineBreak: false,
              });
              doc.fillColor('#000000');
            }
          });

          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000')
            .text('TOTAL', xs.total, startY + headerHeight / 2 - 4, { width: totalColWidth, align: 'center' })
            .text('AVG',   xs.avg,   startY + headerHeight / 2 - 4, { width: avgColWidth,   align: 'center' })
            .text('RANK',  xs.rank,  startY + headerHeight / 2 - 4, { width: rankColWidth,  align: 'center' });
        } else {
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text('#', xs.roll + 1, startY + headerHeight - 16, { width: rollColWidth - 2, align: 'center' });
          doc.text('STUDENT NAME', xs.name + 4, startY + headerHeight - 16, {
            width: nameColWidth - 8, align: 'left',
          });

          subjects.forEach((subj, idx) => {
            const sx = xs.subjects[idx];
            const abbr = abbreviateSubject(subj.name);
            const coefLabel = subj.coefficient != null ? ` (${subj.coefficient})` : '';
            const label = `${abbr}${coefLabel}`;
            doc.save();
            doc.translate(sx + subjectColWidth / 2 - 4, startY + headerHeight - 6);
            doc.rotate(-90);
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
            doc.text(label, 0, 0, { width: headerHeight - 12, align: 'left', lineBreak: false });
            doc.restore();
          });

          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000')
            .text('TOTAL', xs.total, startY + headerHeight - 16, { width: totalColWidth, align: 'center' })
            .text('AVG',   xs.avg,   startY + headerHeight - 16, { width: avgColWidth,   align: 'center' })
            .text('RANK',  xs.rank,  startY + headerHeight - 16, { width: rankColWidth,  align: 'center' });
        }

        drawRowGrid(startY, headerHeight);
        return startY + headerHeight;
      };

      const headerTitle = `CLASS MARKSHEET - ${metadata.class_name.toUpperCase()} (${metadata.evaluation_type.toUpperCase()})`;
      let y = addClassHeader(doc, school, headerTitle);
      y = drawTableHeader(y + 8);

      students.forEach((student, index) => {
        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          const nextY = addClassHeader(doc, school, `${headerTitle} (Continuation)`);
          y = drawTableHeader(nextY + 8);
        }

        doc.rect(marginX, y, tableWidth, rowHeight).fillColor('#FFFFFF').fill();
        doc.fontSize(8).font('Helvetica').fillColor('#000000');

        doc.text(String(index + 1), xs.roll + 1, y + rowHeight / 2 - 4, {
          width: rollColWidth - 2, align: 'center', lineBreak: false,
        });

        doc.font('Helvetica-Bold').text(student.student_name, xs.name + 4, y + rowHeight / 2 - 4, {
          width: nameColWidth - 8, lineBreak: false, ellipsis: true,
        });

        subjects.forEach((subj, si) => {
          const cell = student.marks[subj.name];
          const text = renderCellText(cell);

          if (cell?.isExempt) {
            // EX — italic gray so it visually stands out from real marks
            doc.font('Helvetica-Oblique').fillColor('#666666');
          } else if (cell?.score != null && cell.score < 10) {
            doc.font('Helvetica-Bold').fillColor('#000000');
          } else {
            doc.font('Helvetica').fillColor('#000000');
          }

          doc.text(text, xs.subjects[si], y + rowHeight / 2 - 4, {
            width: subjectColWidth, align: 'center', lineBreak: false,
          });
          doc.fillColor('#000000');
        });

        doc.font('Helvetica-Bold').text(
          student.total != null ? student.total.toFixed(2) : '-',
          xs.total, y + rowHeight / 2 - 4, { width: totalColWidth, align: 'center', lineBreak: false }
        );
        doc.text(
          student.avg != null ? student.avg.toFixed(2) : '-',
          xs.avg, y + rowHeight / 2 - 4, { width: avgColWidth, align: 'center', lineBreak: false }
        );
        doc.text(String(student.rank || '-'), xs.rank, y + rowHeight / 2 - 4, {
          width: rankColWidth, align: 'center', lineBreak: false,
        });

        drawRowGrid(y, rowHeight);
        y += rowHeight;
      });

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).font('Helvetica-BoldOblique').fillColor('#000000')
          .text(
            `Class: ${metadata.class_name}  •  Term: ${metadata.term}  •  AY: ${metadata.academic_year}  •  Students: ${metadata.total_students}`,
            marginX, doc.page.height - 28,
            { width: usableWidth * 0.7, align: 'left' }
          );
        doc.text(`Page ${i + 1} of ${range.count}`,
          marginX + usableWidth * 0.7, doc.page.height - 28,
          { width: usableWidth * 0.3, align: 'right' });
      }

      doc.end();
    } catch (error) { reject(error); }
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

    if (term !== 'N/A' && evaluationType) evaluationType = resolveEvaluationType(evaluationType, term);
    if (!className || !evaluationType) {
      return res.status(400).json({ error: 'Missing required parameters: className and evaluationType.' });
    }

    const students = await ClassReportModel.getStudentsInClass(className, schoolId);
    const subjects = await ClassReportModel.getSubjectsForClass(className, schoolId);
    const marksData = await ClassReportModel.getClassEvaluationMarks(className, evaluationType, schoolId);
    const studentMap = buildStudentMarksMatrix(students, subjects, marksData);

    return res.status(200).json({
      students: studentMap, subjects,
      metadata: {
        class_name: className, evaluation_type: evaluationType,
        total_students: students.length, total_subjects: subjects.length,
        total_marks_found: marksData.length, term, academic_year: academicYear,
      },
    });
  } catch (error) {
    console.error('Error generating class report JSON:', error);
    return res.status(500).json({ error: 'Failed to generate class report.', details: error.message });
  }
};

exports.downloadClassReport = async (req, res) => {
  try {
    let className = req.query.className || req.query.class_name;
    let evaluationType = req.query.evaluationType || req.query.evaluation_type;
    let term = req.query.term || 'N/A';
    const academicYear = getCameroonAcademicYear(req.query.academicYear || req.query.academic_year);
    const schoolId = req.schoolId;

    if (term !== 'N/A' && evaluationType) evaluationType = resolveEvaluationType(evaluationType, term);
    if (!className || !evaluationType) {
      return res.status(400).json({ error: 'Missing required parameters: className and evaluationType.' });
    }

    const students = await ClassReportModel.getStudentsInClass(className, schoolId);
    const subjects = await ClassReportModel.getSubjectsForClass(className, schoolId);
    const marksData = await ClassReportModel.getClassEvaluationMarks(className, evaluationType, schoolId);

    if (!students?.length) return res.status(404).json({ error: 'No students found for this class.' });
    if (!subjects?.length) return res.status(404).json({ error: 'No subjects found for this class.' });

    const studentMap = buildStudentMarksMatrix(students, subjects, marksData);
    const metadata = {
      class_name: className, evaluation_type: evaluationType, term,
      academic_year: academicYear, total_students: students.length, total_subjects: subjects.length,
    };

    const school = await getSchoolConfig(schoolId);
    const pdfBuffer = await generateClassReportPDF(studentMap, subjects, metadata, school);
    const safeFileName = `Marksheet_${className}_${evaluationType}_${academicYear.replace('/', '-')}.pdf`.replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading class report PDF:', error);
    return res.status(500).json({ error: 'Failed to generate PDF document.', details: error.message });
  }
};