// services/ReportCardService.js
const ReportCardModel = require("../models/reportCardModel");
const MarkModel = require("../models/markModel");
const CompetencyModel = require("../models/competencyModel");
const StudentTermReportModel = require("../models/studentTermReportModel");
const EvaluationConfig = require("../config/evaluationConfig");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const { generateReportCardPDF } = require("../utils/pdfGenerator");
const { generateHonourRollPDF } = require("../utils/honourRollPdfGenerator");
const { getSchoolConfig } = require("./schoolConfigCache");

// ─── HELPERS ─────────────────────────────────────────────
const sanitizeFilename = (filename) =>
  filename.replace(/[^a-zA-Z0-9_\-.]/g, '_');

const getReportsDir = (schoolId) =>
  path.join(__dirname, "..", "uploads", "reports", `school_${schoolId}`);

const cleanupOldReports = async (schoolId, maxAgeDays = 7) => {
  const reportsDir = getReportsDir(schoolId);
  const now = Date.now();
  try {
    if (!fs.existsSync(reportsDir)) return;
    const files = await fsp.readdir(reportsDir);
    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      const stats = await fsp.stat(filePath);
      const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) {
        await fsp.unlink(filePath);
        console.log(`🗑 Deleted old report: school_${schoolId}/${file}`);
      }
    }
  } catch (error) {
    console.error("Report cleanup error:", error);
  }
};

const getSubjectRemark = (avg) => {
  if (avg === null) return 'No Mark';
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Very Good';
  if (avg >= 14) return 'Good';
  if (avg >= 12) return 'Fair';
  if (avg >= 10) return 'Pass';
  return 'Needs Improvement';
};

// Which prior terms feed into each term's cumulative average
const PRIOR_TERMS = {
  '1': [],
  '2': ['1'],
  '3': ['1', '2'],
};

// Fetch per-subject averages for ONE term only
const fetchTermSubjectAverages = async (studentId, evaluationTypes, schoolId) => {
  const marksData = await MarkModel.getStudentMarksForReport(studentId, evaluationTypes, schoolId);
  const map = {};
  marksData.forEach((row) => {
    let avg = null;
    if (!row.is_exempt) {
      const scores = [row.eval1, row.eval2].filter((s) => s !== null && s !== undefined);
      if (scores.length > 0) avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    map[row.subject_id] = avg;
  });
  return map;
};

// ─── BUILD TERM REPORT DATA ──────────────────────────────
const buildReportData = async (studentId, className, term, schoolId) => {
  const currentAcademicYear = ReportCardModel.getCurrentAcademicYear();
  const evaluationTypes = EvaluationConfig.getEvaluationTypes(term);
  if (!evaluationTypes || evaluationTypes.length !== 2) {
    throw new Error(`Term ${term} must have exactly two evaluation types.`);
  }

  const studentDetails = await ReportCardModel.getStudentDetails(studentId, schoolId);
  if (!studentDetails) throw new Error(`Student ${studentId} not found`);

  const classId = await ReportCardModel.getClassId(className, schoolId);
  if (!classId) throw new Error(`Class ${className} not found`);

  let subjects = await ReportCardModel.getSubjectsBySpecialty(studentDetails.specialty_id, schoolId);
  if (!subjects || subjects.length === 0) {
    subjects = await ReportCardModel.getSubjectsByClassName(className, schoolId);
  }
  if (!subjects || subjects.length === 0) {
    throw new Error(`No subjects found for class ${className}`);
  }

  // ─── Current term marks ───
  const marksData = await MarkModel.getStudentMarksForReport(studentId, evaluationTypes, schoolId);
  const marksMap = {};
  marksData.forEach(row => {
    marksMap[row.subject_id] = { eval1: row.eval1, eval2: row.eval2, is_exempt: row.is_exempt };
  });

  // ─── Competencies ───
  const compRows = await CompetencyModel.getCompetenciesForClass(classId, evaluationTypes, schoolId);
  const compMap = {};
  compRows.forEach(row => {
    if (!compMap[row.subject_id]) compMap[row.subject_id] = {};
    compMap[row.subject_id][row.evaluation_type] = row.competency;
  });

  // ─── Current term subject processing ───
  let processedSubjects = subjects.map(subj => {
    const marks = marksMap[subj.id] || { eval1: null, eval2: null, is_exempt: true };
    const isExempt = marks.is_exempt;
    let avg = null, total = null;

    if (!isExempt) {
      const scores = [marks.eval1, marks.eval2].filter(s => s !== null && s !== undefined);
      if (scores.length > 0) {
        avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        total = avg * subj.coefficient;
      }
    }

    return {
      subject_id: subj.id,
      subject_name: subj.name,
      coefficient: subj.coefficient,
      eval1: marks.eval1 ?? null,
      eval2: marks.eval2 ?? null,
      isExempt,
      average: avg,
      total,
      remark: isExempt ? 'Exempt' : (avg !== null ? getSubjectRemark(avg) : 'No Mark'),
      competency1: compMap[subj.id]?.[evaluationTypes[0]] || null,
      competency2: compMap[subj.id]?.[evaluationTypes[1]] || null,
    };
  });

  // ─── Cumulative average per subject (prior terms + current) ───
  const priorTermKeys = PRIOR_TERMS[term] || [];
  const priorTermAvgs = {};
  for (const t of priorTermKeys) {
    try {
      const types = EvaluationConfig.getEvaluationTypes(t);
      priorTermAvgs[t] = await fetchTermSubjectAverages(studentId, types, schoolId);
    } catch (err) {
      console.warn(`Could not fetch Term ${t} averages:`, err.message);
      priorTermAvgs[t] = {};
    }
  }

  processedSubjects = processedSubjects.map(subj => {
    const values = [];
    if (subj.average !== null) values.push(subj.average);
    for (const t of priorTermKeys) {
      const prior = priorTermAvgs[t]?.[subj.subject_id];
      if (prior !== null && prior !== undefined) values.push(prior);
    }
    const cumulativeAvg = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
    return { ...subj, cumulativeAvg };
  });

  // ─── Term average ───
  let totalScore = 0, totalCoeff = 0;
  processedSubjects.forEach(s => {
    if (!s.isExempt && s.average !== null && s.coefficient) {
      totalScore += s.average * s.coefficient;
      totalCoeff += s.coefficient;
    }
  });
  const termAverage = totalCoeff > 0 ? totalScore / totalCoeff : 0;

  // ─── Cumulative overall (student's annual) ───
  let cumulativeWeighted = 0, cumulativeCoeff = 0;
  processedSubjects.forEach(s => {
    if (!s.isExempt && s.cumulativeAvg !== null && s.coefficient) {
      cumulativeWeighted += s.cumulativeAvg * s.coefficient;
      cumulativeCoeff += s.coefficient;
    }
  });
  const cumulativeOverallAvg = cumulativeCoeff > 0
    ? cumulativeWeighted / cumulativeCoeff
    : termAverage;

  // ─── TERM RANKING ───
  const allStudents = await ReportCardModel.getStudentsByClass(className, schoolId);
  const classAveragesRaw = await ReportCardModel.getClassAverages(className, evaluationTypes, schoolId);
  const avgMap = {};
  classAveragesRaw.forEach(s => { avgMap[s.studentId] = typeof s.average === 'number' ? s.average : 0; });

  const completeAverages = allStudents.map(s => ({ studentId: s.id, average: avgMap[s.id] ?? 0 }));
  completeAverages.sort((a, b) => {
    const aAvg = Number(parseFloat(a.average || 0).toFixed(4));
    const bAvg = Number(parseFloat(b.average || 0).toFixed(4));
    return bAvg - aAvg;
  });

  let rank = 1;
  for (let i = 0; i < completeAverages.length; i++) {
    if (i > 0 && completeAverages[i].average < completeAverages[i - 1].average) rank = i + 1;
    completeAverages[i].rank = rank;
  }

  const currentStudentObj = completeAverages.find(s => String(s.studentId) === String(studentId));
  const studentRank = currentStudentObj ? currentStudentObj.rank : 0;
  const classAverage = completeAverages.reduce((sum, s) => sum + s.average, 0) / completeAverages.length;
  const highestAverage = Math.max(...completeAverages.map(s => s.average));
  const lowestAverage = Math.min(...completeAverages.map(s => s.average));
  const studentsInClass = completeAverages.length;

  // ─── ANNUAL RANKING ───
  let annualRank = null;
  let annualClassAverage = null;
  let highestAnnualAverage = null;

  try {
    const annualRaw = await ReportCardModel.getAnnualClassAverages(className, schoolId);
    const annualMap = {};
    annualRaw.forEach(s => { annualMap[s.studentId] = typeof s.annualAvg === 'number' ? s.annualAvg : 0; });

    const completeAnnual = allStudents.map(s => ({
      studentId: s.id,
      annualAvg: annualMap[s.id] ?? 0,
    }));
    completeAnnual.sort((a, b) => b.annualAvg - a.annualAvg);

    let aRank = 1;
    for (let i = 0; i < completeAnnual.length; i++) {
      if (i > 0 && completeAnnual[i].annualAvg < completeAnnual[i - 1].annualAvg) aRank = i + 1;
      completeAnnual[i].rank = aRank;
    }

    const currentAnnual = completeAnnual.find(s => String(s.studentId) === String(studentId));
    annualRank = currentAnnual ? currentAnnual.rank : null;
    annualClassAverage = completeAnnual.reduce((sum, s) => sum + s.annualAvg, 0) / completeAnnual.length;
    highestAnnualAverage = Math.max(...completeAnnual.map(s => s.annualAvg));
  } catch (err) {
    console.warn('Could not compute annual ranking:', err.message);
  }

  // ─── Decision ───
  const decisionAverage = term === '3' ? cumulativeOverallAvg : termAverage;
  const decision = decisionAverage >= 10 ? 'Pass' : 'Fail';

  const attendanceStats = await ReportCardModel.getAttendanceStatsForStudent(studentId, currentAcademicYear, term, schoolId);
  const extraReport = await StudentTermReportModel.getByStudent(studentId, currentAcademicYear, term, schoolId);

  return {
    header: { term: `${term} REPORT CARD`, academicYear: currentAcademicYear },
    studentInfo: {
      name: studentDetails.full_name,
      dob: studentDetails.date_of_birth ? studentDetails.date_of_birth.toLocaleDateString('en-GB') : 'N/A',
      class: className,
      specialty: studentDetails.specialty_name || 'N/A',
      faculty: studentDetails.faculty_name || 'N/A',
      gender: studentDetails.gender || 'N/A',
      admissionNo: 'N/A',
    },
    subjects: processedSubjects,
    summary: {
      totalCoeff,
      totalScore: Number(totalScore.toFixed(2)),
      termAverage: Number(termAverage.toFixed(2)),
      cumulativeAverage: Number(cumulativeOverallAvg.toFixed(2)),
      annualAverage: Number(cumulativeOverallAvg.toFixed(2)),
      annualRank,
      annualClassAverage: annualClassAverage !== null ? Number(annualClassAverage.toFixed(2)) : null,
      highestAnnualAverage: highestAnnualAverage !== null ? Number(highestAnnualAverage.toFixed(2)) : null,
      classAverage: Number(classAverage.toFixed(2)),
      rank: studentRank,
      studentsInClass,
      decision,
      highestAverage: Number(highestAverage.toFixed(2)),
      lowestAverage: Number(lowestAverage.toFixed(2)),
    },
    extra: {
      attendancePresent: attendanceStats.present,
      attendanceAbsent: attendanceStats.absent,
      attendancePercentage: attendanceStats.percentage,
      conduct: extraReport?.conduct || '',
      classTeacherComment: extraReport?.class_teacher_comment || '',
    },
    evaluationTypes,
    termType: term,
    isHonourRoll: cumulativeOverallAvg >= 15,
  };
};

// ─── GENERATE SINGLE REPORT ──────────────────────────────
const generateSingleReport = async (studentId, className, term, schoolId) => {
  const uploadsDir = getReportsDir(schoolId);
  await fsp.mkdir(uploadsDir, { recursive: true });

  const school = await getSchoolConfig(schoolId);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 25, right: 25 } });

  // Treat "Final Year" as Term 3 (the unified template already shows annual)
  const effectiveTerm = term === 'Final Year' ? '3' : term;
  const isFinal = effectiveTerm === '3';

  const data = await buildReportData(studentId, className, effectiveTerm, schoolId);
  const studentName = data.studentInfo.name;
  const fileName = sanitizeFilename(
    `${className}_${studentName.replace(/\s+/g, '_')}_${effectiveTerm.replace(/\s+/g, '')}.pdf`
  );
  const filePath = path.join(uploadsDir, fileName);

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);
  generateReportCardPDF(doc, data, isFinal, school);
  doc.end();

  await new Promise((res, rej) => {
    writeStream.on('finish', res);
    writeStream.on('error', rej);
  });

  const stats = await fsp.stat(filePath);
  return {
    fileName,
    filePath,
    studentName,
    fileSize: (stats.size / 1024 / 1024).toFixed(2),
    termAverage: data.summary.termAverage,
    rank: data.summary.rank,
    pageCount: 1,
  };
};

// ─── GENERATE CLASS REPORT ───────────────────────────────
const generateClassReport = async (className, term, schoolId) => {
  const students = await ReportCardModel.getStudentsByClass(className, schoolId);
  if (!students || students.length === 0) throw new Error(`No students in class ${className}`);

  const uploadsDir = getReportsDir(schoolId);
  await fsp.mkdir(uploadsDir, { recursive: true });

  const school = await getSchoolConfig(schoolId);
  const effectiveTerm = term === 'Final Year' ? '3' : term;
  const isFinal = effectiveTerm === '3';

  const fileName = sanitizeFilename(`${className}_${effectiveTerm}_Reports.pdf`);
  const filePath = path.join(uploadsDir, fileName);

  const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 25, right: 25 } });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  let studentCount = 0;
  const errors = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    try {
      const data = await buildReportData(student.id, className, effectiveTerm, schoolId);
      if (i > 0) doc.addPage();
      generateReportCardPDF(doc, data, isFinal, school);
      studentCount++;
    } catch (err) {
      console.error(`❌ Failed report for ${student.name} (${student.id}):`, err.message);
      errors.push({ studentId: student.id, studentName: student.name, error: err.message });
    }
  }

  doc.end();
  await new Promise((res, rej) => {
    writeStream.on('finish', res);
    writeStream.on('error', rej);
  });

  if (studentCount === 0) {
    throw new Error(`No reports could be generated. Errors: ${errors.map(e => e.error).join('; ')}`);
  }

  const stats = await fsp.stat(filePath);
  await cleanupOldReports(schoolId);

  return {
    success: true,
    message: `Class reports generated for ${studentCount} students`,
    downloadPath: `/api/report-cards/download/school_${schoolId}/${fileName}`,
    fileSize: (stats.size / 1024 / 1024).toFixed(2),
    generatedCount: studentCount,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
};

// ─── SERVICE EXPORT ──────────────────────────────────────
const ReportCardService = {
  getClasses: async (schoolId) => await ReportCardModel.getClasses(schoolId),
  getStudents: async (className, schoolId) => await ReportCardModel.getStudentsByClass(className, schoolId),
  getTerms: async (schoolId) => {
    const terms = await ReportCardModel.getTerms(schoolId);
    return ['1', '2', '3'].filter(t => terms.includes(t) || true);
  },

  generateStudentReport: async (studentId, className, term, schoolId) => {
    const result = await generateSingleReport(studentId, className, term, schoolId);
    await cleanupOldReports(schoolId);
    return {
      success: true,
      message: `Report card generated (${result.fileSize}MB)`,
      downloadPath: `/api/report-cards/download/school_${schoolId}/${result.fileName}`,
      fileSize: result.fileSize,
      studentName: result.studentName,
      termAverage: result.termAverage,
      rank: result.rank,
    };
  },

  generateClassReport: async (className, term, schoolId) => await generateClassReport(className, term, schoolId),

  generateFinalYearReport: async (studentId, className, schoolId) =>
    await generateSingleReport(studentId, className, '3', schoolId),

  generateHonourRoll: async (studentId, className, term, schoolId) => {
    const effectiveTerm = term === 'Final Year' ? '3' : term;
    const reportData = await buildReportData(studentId, className, effectiveTerm, schoolId);
    if (!reportData.isHonourRoll) throw new Error("Student does not qualify for Honour Roll (average < 15)");

    const uploadsDir = getReportsDir(schoolId);
    await fsp.mkdir(uploadsDir, { recursive: true });
    const school = await getSchoolConfig(schoolId);

    const fileName = sanitizeFilename(`HonourRoll_${reportData.studentInfo.name.replace(/\s+/g, '_')}_${effectiveTerm}.pdf`);
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 25, right: 25 } });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    generateHonourRollPDF(doc, reportData, school);
    doc.end();

    await new Promise((res, rej) => {
      writeStream.on('finish', res);
      writeStream.on('error', rej);
    });

    const stats = await fsp.stat(filePath);
    return {
      success: true,
      message: "Honour Roll certificate generated",
      downloadPath: `/api/report-cards/download/school_${schoolId}/${fileName}`,
      fileSize: (stats.size / 1024 / 1024).toFixed(2),
    };
  },

  generateBatchHonourRoll: async (className, term, schoolId) => {
    const effectiveTerm = term === 'Final Year' ? '3' : term;
    const students = await ReportCardModel.getStudentsByClass(className, schoolId);
    if (!students || students.length === 0) throw new Error(`No students in class ${className}`);

    const uploadsDir = getReportsDir(schoolId);
    await fsp.mkdir(uploadsDir, { recursive: true });
    const school = await getSchoolConfig(schoolId);

    const generated = [];
    const errors = [];

    for (const student of students) {
      try {
        const reportData = await buildReportData(student.id, className, effectiveTerm, schoolId);
        if (reportData.isHonourRoll) {
          const fileName = sanitizeFilename(`HonourRoll_${reportData.studentInfo.name.replace(/\s+/g, '_')}_${effectiveTerm}.pdf`);
          const filePath = path.join(uploadsDir, fileName);
          const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 25, right: 25 } });
          const writeStream = fs.createWriteStream(filePath);
          doc.pipe(writeStream);
          generateHonourRollPDF(doc, reportData, school);
          doc.end();
          await new Promise((res, rej) => {
            writeStream.on('finish', res);
            writeStream.on('error', rej);
          });
          generated.push({ studentName: reportData.studentInfo.name, fileName });
        }
      } catch (err) {
        errors.push({ studentId: student.id, studentName: student.name, error: err.message });
      }
    }

    if (generated.length === 0) throw new Error("No students qualify for Honour Roll (average < 15)");

    const zipFileName = sanitizeFilename(`HonourRoll_${className}_${effectiveTerm}.zip`);
    const zipFilePath = path.join(uploadsDir, zipFileName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.pipe(output);
      generated.forEach(r => archive.file(path.join(uploadsDir, r.fileName), { name: r.fileName }));
      archive.finalize();
    });

    for (const r of generated) {
      await fsp.unlink(path.join(uploadsDir, r.fileName)).catch(() => {});
    }
    await cleanupOldReports(schoolId);

    return {
      success: true,
      message: `Honour Roll certificates generated for ${generated.length} students`,
      downloadPath: `/api/report-cards/download/school_${schoolId}/${zipFileName}`,
      generatedCount: generated.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  cleanupReports: async (maxAgeDays = 0, schoolId) => {
    await cleanupOldReports(schoolId, maxAgeDays);
    return { message: `Reports older than ${maxAgeDays} days deleted` };
  },
};

module.exports = ReportCardService;