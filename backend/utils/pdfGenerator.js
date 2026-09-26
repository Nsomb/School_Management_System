// utils/pdfGenerator.js
// ═══════════════════════════════════════════════════════════════════
// UNIFIED REPORT CARD — A4 Portrait
// Term 1 / Term 2: 9 columns (no Annual Avg)
// Term 3 / Final:  10 columns (Annual Avg included)
// Decision is a ROW inside STUDENT PERFORMANCE (all terms)
// Header has no ellipse around the logo
// ═══════════════════════════════════════════════════════════════════

const PDFDocument = require('pdfkit');
const path = require('path');

const COUNTRY = {
  nameEn: 'REPUBLIC OF CAMEROON',
  nameFr: 'RÉPUBLIQUE DU CAMEROUN',
  mottoEn: 'Peace – Work – Fatherland',
  mottoFr: 'Paix – Travail – Patrie',
  defaultMinistryEn: 'MINISTRY OF SECONDARY EDUCATION',
  defaultMinistryFr: "MINISTÈRE DE L'ENSEIGNEMENT SECONDAIRE",
};

const PAGE = {
  width: 595,
  height: 842,
  leftMargin: 30,
  rightMargin: 30,
  bottomMargin: 30,
  get contentWidth() { return this.width - this.leftMargin - this.rightMargin; }, // 535
};

// ─── Term 1 / Term 2 columns (9 total = 535) ───
// Competency columns absorb the width freed up from the number columns.
const TERM_COLUMNS = {
  subject: 90,
  eval1: 15,
  competency1: 160,
  eval2: 15,
  competency2: 160,
  average: 20,
  coefficient: 15,
  total: 25,
  remark: 35,
  get totalWidth() {
    return this.subject + this.eval1 + this.competency1 + this.eval2 +
      this.competency2 + this.average + this.coefficient + this.total + this.remark;
  },
};

// ─── Term 3 / Final columns (10 total = 535) ───
// Competency columns absorb the width freed up from the number columns.
const FINAL_COLUMNS = {
  subject: 78,
  eval1: 15,
  competency1: 152,
  eval2: 15,
  competency2: 152,
  average: 20,
  coefficient: 15,
  total: 25,
  annualAvg: 28,
  remark: 35,
  get totalWidth() {
    return this.subject + this.eval1 + this.competency1 + this.eval2 +
      this.competency2 + this.average + this.coefficient +
      this.total + this.annualAvg + this.remark;
  },
};

const SUBJECT_ROW_HEIGHT_MIN = 12;
const SUBJECT_ROW_HEIGHT_MAX = 20;
const SUBJECT_TABLE_HEADER_HEIGHT = 13;
const STAT_TITLE_HEIGHT = 11;
const STAT_ROW_HEIGHT = 10;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getShortEvalLabel = (evalType) => {
  const match = evalType.match(/(\d+)(?:st|nd|rd|th)?/);
  return match ? `E${match[1]}` : evalType;
};

const getOrdinalSuffix = (n) => {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return n + 'th';
};

const getRemark = (avg) => {
  if (avg === null) return 'No Mark';
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Very Good';
  if (avg >= 14) return 'Good';
  if (avg >= 12) return 'Fair';
  if (avg >= 10) return 'Pass';
  return 'Below Average';
};

const getCouncilDecision = (avg) => {
  if (isNaN(avg)) return 'Pending';
  if (avg >= 14) return 'Passed with Distinction';
  if (avg >= 12) return 'Passed with Merit';
  if (avg >= 10) return 'Passed';
  if (avg >= 8) return 'Below Average, Can Do Better';
  return 'Unsatisfactory Performance';
};

const getDecisionColor = (text) => {
  const t = (text || '').toLowerCase();
  if (t.startsWith('passed') || t.includes('promoted')) return '#2e7d32';
  if (t.includes('repeat') || t.includes('unsatisfactory')) return '#c62828';
  if (t.includes('below')) return '#e65100';
  if (t.includes('pending')) return '#666666';
  return '#1a4b8c';
};

const resolveLogoPath = (logoUrl) => {
  if (!logoUrl) return null;
  const cleanUrl = logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl;
  return path.join(__dirname, '..', cleanUrl);
};

const getAnnualAverage = (subj) => {
  if (subj.cumulativeAvg != null) return subj.cumulativeAvg;
  if (subj.annualAvg != null) return subj.annualAvg;
  const prior = [subj.term1Avg, subj.term2Avg, subj.term3Avg].filter((v) => v != null);
  if (prior.length > 0) return prior.reduce((a, b) => a + b, 0) / prior.length;
  if (subj.average != null) return subj.average;
  return null;
};

// ═══════════════════════════════════════════════════════════════
// HEADER — no ellipse
// ═══════════════════════════════════════════════════════════════
function drawHeader(doc, term, academicYear, school = {}, isFinalYear = false) {
  const {
    name: schoolName, name_french: schoolNameFrench,
    motto: schoolMotto, motto_french: schoolMottoFrench,
    ministry, ministry_french: ministryFrench,
    region, region_french: regionFrench,
    division, division_french: divisionFrench,
    logo_url: logoUrl,
  } = school;

  const logoPath = resolveLogoPath(logoUrl);
  const leftX = PAGE.leftMargin;
  const centerWidth = 140;
  const gap = 8;
  const colWidth = (PAGE.contentWidth - centerWidth - gap * 2) / 2;
  const rightX = leftX + colWidth + gap + centerWidth + gap;
  const centerX = leftX + colWidth + gap;
  const separator = '*****';
  const startY = 30;

  const buildLines = (isEnglish) => {
    const lines = [
      { text: isEnglish ? COUNTRY.nameEn : COUNTRY.nameFr, bold: true },
      { sep: true },
      { text: isEnglish ? COUNTRY.mottoEn : COUNTRY.mottoFr, bold: true, italic: true },
      { sep: true },
      {
        text: isEnglish
          ? (ministry || COUNTRY.defaultMinistryEn)
          : (ministryFrench || COUNTRY.defaultMinistryFr),
        bold: true,
      },
    ];
    const reg = isEnglish ? region : regionFrench;
    const div = isEnglish ? division : divisionFrench;
    if (reg) {
      lines.push({ sep: true }, {
        text: `${isEnglish ? 'REGIONAL DELEGATION OF' : 'DÉLÉGATION RÉGIONALE DE'} ${reg.toUpperCase()}`,
        bold: true,
      });
    }
    if (div) {
      lines.push({ sep: true }, {
        text: `${isEnglish ? 'DIVISIONAL DELEGATION OF' : 'DÉLÉGATION DÉPARTEMENTALE DE'} ${div.toUpperCase()}`,
        bold: true,
      });
    }
    lines.push({ sep: true }, {
      text: (isEnglish ? schoolName : (schoolNameFrench || schoolName) || '').toUpperCase(),
      bold: true,
    });
    return lines;
  };

  const drawColumn = (x, width, lines, align) => {
    let cy = startY;
    lines.forEach((line) => {
      if (line.sep) {
        doc.fontSize(5).font('Helvetica-Bold').fillColor('#555555');
        doc.text(separator, x, cy, { width, align: 'center' });
        cy += 7;
        doc.fillColor('#000000');
      } else {
        const font = line.bold && line.italic ? 'Helvetica-BoldOblique'
          : line.bold ? 'Helvetica-Bold'
          : line.italic ? 'Helvetica-Oblique'
          : 'Helvetica-Bold';
        doc.fontSize(6).font(font).fillColor('#000000');
        doc.text(line.text, x, cy, { width, align });
        cy += 9;
      }
    });
    return cy;
  };

  const leftEndY = drawColumn(leftX, colWidth, buildLines(true), 'center');
  const rightEndY = drawColumn(rightX, colWidth, buildLines(false), 'center');

  // ─── CENTER: logo (NO ELLIPSE) + school motto below ───
  const logoCenterY = startY + 45;
  const LOGO_SIZE = 46;

  if (logoPath) {
    try {
      doc.image(
        logoPath,
        centerX + centerWidth / 2 - LOGO_SIZE / 2,
        logoCenterY - LOGO_SIZE / 2,
        { width: LOGO_SIZE, height: LOGO_SIZE }
      );
    } catch (e) {
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#666666');
      doc.text('School Logo', centerX, logoCenterY - 6, { width: centerWidth, align: 'center' });
    }
  } else {
    doc.fontSize(6).font('Helvetica-Bold').fillColor('#666666');
    doc.text('School Logo', centerX, logoCenterY - 6, { width: centerWidth, align: 'center' });
  }

  const mottoText = schoolMottoFrench || schoolMotto;
  if (mottoText) {
    doc.fontSize(5.5).font('Helvetica-BoldOblique').fillColor('#2e7d32');
    doc.text(mottoText.toUpperCase(), centerX, logoCenterY + LOGO_SIZE / 2 + 3, {
      width: centerWidth, align: 'center',
    });
  }

  const afterColumnsY = Math.max(leftEndY, rightEndY) + 6;
  const lineY = Math.max(afterColumnsY, logoCenterY + LOGO_SIZE / 2 + 14);

  doc.strokeColor('#1a4b8c').lineWidth(0.75)
    .moveTo(leftX, lineY)
    .lineTo(leftX + PAGE.contentWidth, lineY)
    .stroke();

  const infoY = lineY + 6;
  const titleText = isFinalYear || term === '3'
    ? 'END OF YEAR REPORT CARD'
    : 'SCHOOL REPORT CARD';
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a4b8c');
  doc.text(titleText, leftX, infoY, { width: PAGE.contentWidth, align: 'center' });

  const infoY2 = infoY + 12;
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
  doc.text(`ACADEMIC YEAR: ${academicYear}`, leftX, infoY2);
  doc.text(`TERM: ${term}`, leftX, infoY2, { width: PAGE.contentWidth, align: 'right' });

  return infoY2 + 12;
}

// ═══════════════════════════════════════════════════════════════
// STUDENT INFO TABLE
// ═══════════════════════════════════════════════════════════════
function drawStudentInfoTable(doc, x, y, width, pairs) {
  const rowHeight = 11;
  const titleHeight = 11;
  const colW = width / 4;

  doc.rect(x, y, width, titleHeight).fill('#1a4b8c');
  doc.fontSize(6).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('STUDENT INFORMATION', x + 4, y + 2.5, { width: width - 8 });

  let rowY = y + titleHeight;
  pairs.forEach((pair, idx) => {
    if (idx % 2 === 0) doc.rect(x, rowY, width, rowHeight).fill('#f8f9fa');
    const [label1, value1, label2, value2] = pair;
    doc.fontSize(5).font('Helvetica-Bold').fillColor('#555555');
    doc.text(label1 + ':', x + 4, rowY + 2.5, { width: colW - 8 });
    doc.font('Helvetica-Bold').fillColor('#000000');
    doc.text(String(value1 || 'N/A').toUpperCase(), x + colW, rowY + 2.5, { width: colW - 8, ellipsis: true });
    doc.font('Helvetica-Bold').fillColor('#555555');
    doc.text(label2 + ':', x + colW * 2, rowY + 2.5, { width: colW - 8 });
    doc.font('Helvetica-Bold').fillColor('#000000');
    doc.text(String(value2 || 'N/A').toUpperCase(), x + colW * 3, rowY + 2.5, { width: colW - 8, ellipsis: true });
    if (idx < pairs.length - 1) {
      doc.moveTo(x, rowY + rowHeight).lineTo(x + width, rowY + rowHeight)
        .strokeColor('#cccccc').lineWidth(0.3).stroke();
    }
    rowY += rowHeight;
  });

  const totalHeight = titleHeight + pairs.length * rowHeight;
  doc.rect(x, y, width, totalHeight).stroke('#1a4b8c').lineWidth(0.8);
  return y + totalHeight;
}

// ═══════════════════════════════════════════════════════════════
// STAT TABLE — decision rows get amber background
// ═══════════════════════════════════════════════════════════════
function drawStatTable(doc, x, y, width, title, rows) {
  const titleHeight = STAT_TITLE_HEIGHT;
  const rowHeight = STAT_ROW_HEIGHT;
  const labelColWidth = Math.round(width * 0.55);
  const valueColWidth = width - labelColWidth;

  doc.rect(x, y, width, titleHeight).fill('#1a4b8c');
  doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text(title, x + 4, y + 2, { width: width - 8 });

  let rowY = y + titleHeight;
  rows.forEach((row, idx) => {
    if (row.isDecision) {
      doc.rect(x, rowY, width, rowHeight).fill('#fff8e1');
    } else if (idx % 2 === 0) {
      doc.rect(x, rowY, width, rowHeight).fill('#f8f9fa');
    }

    doc.fontSize(5).font('Helvetica-Bold').fillColor('#333333');
    doc.text(row.label, x + 4, rowY + 2, { width: labelColWidth - 8 });

    if (row.isDecision) {
      doc.font('Helvetica-Bold').fillColor(getDecisionColor(row.value));
      doc.text(String(row.value).toUpperCase(), x + labelColWidth, rowY + 2, {
        width: valueColWidth - 4, ellipsis: true,
      });
    } else {
      doc.font('Helvetica-Bold').fillColor(row.highlight ? '#1a4b8c' : '#000000');
      doc.text(row.value, x + labelColWidth, rowY + 2, {
        width: valueColWidth - 4, ellipsis: true,
      });
    }

    doc.moveTo(x + labelColWidth, rowY)
      .lineTo(x + labelColWidth, rowY + rowHeight)
      .strokeColor('#aaaaaa').lineWidth(0.5).stroke();

    if (idx < rows.length - 1) {
      doc.moveTo(x, rowY + rowHeight).lineTo(x + width, rowY + rowHeight)
        .strokeColor('#cccccc').lineWidth(0.3).stroke();
    }
    rowY += rowHeight;
  });

  const totalHeight = titleHeight + rows.length * rowHeight;
  doc.rect(x, y, width, totalHeight).stroke('#1a4b8c').lineWidth(0.8);
  return y + totalHeight;
}

// ═══════════════════════════════════════════════════════════════
// CONDUCT
// ═══════════════════════════════════════════════════════════════
const CONDUCT_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Improvement', 'Poor'];

function drawConductChecklist(doc, x, y, width, selected) {
  doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
  doc.text('Conduct:', x, y);

  const startY = y + 8;
  const colWidth = width / 6;
  const boxSize = 7;
  const normalized = (selected || '').trim().toLowerCase();

  CONDUCT_OPTIONS.forEach((option, idx) => {
    const boxX = x + idx * colWidth;
    const boxY = startY;
    const isChecked = option.toLowerCase() === normalized;

    doc.rect(boxX, boxY, boxSize, boxSize).stroke('#666666').lineWidth(0.5);
    if (isChecked) {
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#1a4b8c');
      doc.text('X', boxX, boxY, { width: boxSize, align: 'center' });
    }
    doc.fontSize(5).font(isChecked ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
    doc.text(option, boxX + boxSize + 3, boxY, {
      width: colWidth - boxSize - 5, ellipsis: true,
    });
  });

  return startY + 9 + 3;
}

function drawSignatureBlock(doc, y) {
  const blockWidth = 130;
  const gap = 12;
  const startX = PAGE.leftMargin;
  const labels = ['Class Master', 'Principal', 'Parent / Guardian'];

  doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
  labels.forEach((label, i) => {
    const x = startX + i * (blockWidth + gap);
    doc.moveTo(x, y + 18).lineTo(x + blockWidth - 10, y + 18)
      .strokeColor('#666666').lineWidth(0.5).stroke();
    doc.text(label, x, y + 21, { width: blockWidth });
  });

  const stampX = PAGE.leftMargin + PAGE.contentWidth - 55;
  doc.rect(stampX, y, 55, 35).dash(2, { space: 2 })
    .strokeColor('#999999').lineWidth(0.5).stroke();
  doc.undash();
  doc.fontSize(4.5).font('Helvetica-BoldOblique').fillColor('#999999');
  doc.text('School Stamp', stampX, y + 14, { width: 55, align: 'center' });

  return y + 38;
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════
function generateReportCardPDF(doc, data, isFinalYear = false, school = {}) {
  const { header, studentInfo, subjects, summary, extra, evaluationTypes, termType } = data;

  const showAnnualColumn = isFinalYear || termType === '3';

  let y = drawHeader(doc, header.term, header.academicYear, school, isFinalYear);

  const infoPairs = [
    ['Name', studentInfo.name, 'Class', studentInfo.class],
    ['Gender', studentInfo.gender, 'Date of Birth', studentInfo.dob],
    ['Specialty', studentInfo.specialty, 'Faculty', studentInfo.faculty],
  ];
  y = drawStudentInfoTable(doc, PAGE.leftMargin, y, PAGE.contentWidth, infoPairs) + 6;

  const tableTop = y;
  const startX = PAGE.leftMargin;
  const cols = showAnnualColumn ? FINAL_COLUMNS : TERM_COLUMNS;

  let evalLabel1 = 'E1', evalLabel2 = 'E2';
  if (evaluationTypes && evaluationTypes.length === 2) {
    evalLabel1 = getShortEvalLabel(evaluationTypes[0]);
    evalLabel2 = getShortEvalLabel(evaluationTypes[1]);
  }

  let colWidths, headers;
  if (showAnnualColumn) {
    colWidths = [
      cols.subject, cols.eval1, cols.competency1, cols.eval2, cols.competency2,
      cols.average, cols.coefficient, cols.total, cols.annualAvg, cols.remark,
    ];
    headers = [
      'Subject', evalLabel1, 'Competency 1', evalLabel2, 'Competency 2',
      'Avg', 'Coef', 'Total', 'Annual Avg', 'Remark',
    ];
  } else {
    colWidths = [
      cols.subject, cols.eval1, cols.competency1, cols.eval2, cols.competency2,
      cols.average, cols.coefficient, cols.total, cols.remark,
    ];
    headers = [
      'Subject', evalLabel1, 'Competency 1', evalLabel2, 'Competency 2',
      'Avg', 'Coef', 'Total', 'Remark',
    ];
  }

  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerHeight = SUBJECT_TABLE_HEADER_HEIGHT;

  const footerReserve = 210;
  const bottomLimit = PAGE.height - PAGE.bottomMargin;
  const availableForTable = bottomLimit - footerReserve - tableTop - headerHeight;
  const subjectCount = Math.max(subjects.length, 1);
  const rowHeight = clamp(
    Math.floor(availableForTable / subjectCount),
    SUBJECT_ROW_HEIGHT_MIN,
    SUBJECT_ROW_HEIGHT_MAX
  );

  // ─── Table header ───
  doc.rect(startX, tableTop - 3, totalTableWidth, headerHeight).fill('#1a4b8c');
  doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#ffffff');
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 2, tableTop + 1, { width: colWidths[i] - 4, align: 'center' });
    x += colWidths[i];
  });

  // ─── Rows ───
  let rowY = tableTop + headerHeight - 2;
  doc.fontSize(5).font('Helvetica').fillColor('#333333');
  const rowsPositions = [];
  let lastRowY = rowY;

  subjects.forEach((subj) => {
    if (rowY + rowHeight > bottomLimit - footerReserve) {
      doc.addPage();
      rowY = 50;
    }

    const singleLineY = rowY + Math.max(2, (rowHeight - 6) / 2);
    x = startX;

    const subjName = subj.subject_name.length > 18
      ? subj.subject_name.substring(0, 17) + '…'
      : subj.subject_name;
    doc.font('Helvetica-Bold').fillColor('#333333')
      .text(subjName, x + 2, singleLineY, { width: colWidths[0] - 6, ellipsis: true });
    x += colWidths[0];

    const isExempt = subj.isExempt;

    const m1 = isExempt ? 'EX' : (subj.eval1 !== null && subj.eval1 !== undefined ? subj.eval1.toFixed(1) : '-');
    doc.font('Helvetica').text(m1, x + 2, singleLineY, { width: colWidths[1] - 4, align: 'center' });
    x += colWidths[1];

    const c1 = isExempt ? 'EX' : (subj.competency1 || '-');
    doc.font('Helvetica').text(c1, x + 2, rowY + 1, {
      width: colWidths[2] - 6, height: rowHeight - 3, ellipsis: true,
    });
    x += colWidths[2];

    const m2 = isExempt ? 'EX' : (subj.eval2 !== null && subj.eval2 !== undefined ? subj.eval2.toFixed(1) : '-');
    doc.font('Helvetica').text(m2, x + 2, singleLineY, { width: colWidths[3] - 4, align: 'center' });
    x += colWidths[3];

    const c2 = isExempt ? 'EX' : (subj.competency2 || '-');
    doc.font('Helvetica').text(c2, x + 2, rowY + 1, {
      width: colWidths[4] - 6, height: rowHeight - 3, ellipsis: true,
    });
    x += colWidths[4];

    const avg = isExempt ? 'EX' : (subj.average !== null && subj.average !== undefined ? subj.average.toFixed(1) : '-');
    doc.font('Helvetica-Bold').text(avg, x + 2, singleLineY, { width: colWidths[5] - 4, align: 'center' });
    x += colWidths[5];

    doc.font('Helvetica').text(subj.coefficient.toString(), x + 2, singleLineY, {
      width: colWidths[6] - 4, align: 'center',
    });
    x += colWidths[6];

    const total = isExempt ? 'EX' : (subj.total !== null && subj.total !== undefined ? subj.total.toFixed(1) : '-');
    doc.font('Helvetica-Bold').text(total, x + 2, singleLineY, { width: colWidths[7] - 4, align: 'center' });
    x += colWidths[7];

    if (showAnnualColumn) {
      const annual = getAnnualAverage(subj);
      const annualText = isExempt ? 'EX' : (annual !== null ? annual.toFixed(1) : '-');
      doc.font('Helvetica-Bold').fillColor('#1a4b8c')
        .text(annualText, x + 2, singleLineY, { width: colWidths[8] - 4, align: 'center' });
      doc.fillColor('#333333');
      x += colWidths[8];
    }

    const remarkIdx = showAnnualColumn ? 9 : 8;
    const remarkText = isExempt
      ? 'Exempt'
      : (subj.average !== null && subj.average !== undefined ? getRemark(subj.average) : '-');
    doc.font('Helvetica').text(remarkText, x + 2, singleLineY, {
      width: colWidths[remarkIdx] - 4, align: 'center', ellipsis: true,
    });

    rowsPositions.push({ top: rowY, bottom: rowY + rowHeight });
    lastRowY = rowY + rowHeight;
    rowY += rowHeight;
  });

  const tableBottom = lastRowY;
  const tableHeight = tableBottom - (tableTop - 3);
  doc.rect(startX, tableTop - 3, totalTableWidth, tableHeight)
    .strokeColor('#333333').lineWidth(0.8).stroke();

  let xPos = startX;
  for (let i = 0; i < colWidths.length - 1; i++) {
    xPos += colWidths[i];
    doc.moveTo(xPos, tableTop - 3).lineTo(xPos, tableBottom)
      .strokeColor('#666666').lineWidth(0.5).stroke();
  }

  doc.moveTo(startX, tableTop + headerHeight - 3)
    .lineTo(startX + totalTableWidth, tableTop + headerHeight - 3)
    .strokeColor('#666666').lineWidth(0.5).stroke();

  rowsPositions.forEach((pos, idx) => {
    if (idx < rowsPositions.length - 1) {
      doc.moveTo(startX, pos.bottom).lineTo(startX + totalTableWidth, pos.bottom)
        .strokeColor('#cccccc').lineWidth(0.3).stroke();
    }
  });

  // ═══════════ SUMMARY PANELS ═══════════
  const boxY = Math.min(rowY + 6, PAGE.height - PAGE.bottomMargin - 175);
  const panelWidth = (PAGE.contentWidth - 10) / 2;
  const gap = 10;

  const hasAnnual = summary.annualAverage !== null && summary.annualAverage !== undefined;

  // ─── STUDENT PERFORMANCE ROWS ───
  const studentRows = [];

  if (showAnnualColumn) {
    studentRows.push(
      { label: 'Term Avg', value: `${summary.termAverage} / 20` },
      { label: 'Term Rank', value: `${getOrdinalSuffix(summary.rank)} / ${summary.studentsInClass}` },
      {
        label: 'Annual Avg',
        value: hasAnnual ? `${summary.annualAverage} / 20` : '—',
        highlight: true,
      },
      {
        label: 'Annual Rank',
        value: summary.annualRank ? `${getOrdinalSuffix(summary.annualRank)} / ${summary.studentsInClass}` : '—',
        highlight: true,
      }
    );
  } else {
    studentRows.push(
      { label: 'Average', value: `${summary.termAverage} / 20` },
      { label: 'Rank', value: `${getOrdinalSuffix(summary.rank)} / ${summary.studentsInClass}` },
      {
        label: 'Weighted Score',
        value: `${summary.totalScore} (Coef ${summary.totalCoeff})`,
      }
    );
  }

  const decisionText = showAnnualColumn
    ? (parseFloat(summary.cumulativeAverage || summary.annualAverage || summary.termAverage) >= 10
        ? 'Promoted'
        : 'Repeated')
    : getCouncilDecision(parseFloat(summary.termAverage));

  studentRows.push({ label: 'Decision', value: decisionText, isDecision: true });

  // ─── CLASS PERFORMANCE ROWS ───
  const classRows = showAnnualColumn
    ? [
        { label: 'Term Class Avg', value: `${summary.classAverage} / 20` },
        {
          label: 'Annual Class Avg',
          value: summary.annualClassAverage != null ? `${summary.annualClassAverage} / 20` : '—',
          highlight: true,
        },
        {
          label: 'Highest Annual',
          value: summary.highestAnnualAverage != null
            ? `${summary.highestAnnualAverage} / 20`
            : `${summary.highestAverage} / 20`,
          highlight: true,
        },
        { label: 'Total Students', value: String(summary.studentsInClass) },
      ]
    : [
        { label: 'Class Average', value: `${summary.classAverage} / 20` },
        { label: 'Highest Average', value: `${summary.highestAverage} / 20` },
        { label: 'Lowest Average', value: `${summary.lowestAverage} / 20` },
        { label: 'Total Students', value: String(summary.studentsInClass) },
      ];

  const afterStudentTable = drawStatTable(doc, startX, boxY, panelWidth, 'STUDENT PERFORMANCE', studentRows);
  const rightPanelX = startX + panelWidth + gap;
  const afterClassTable = drawStatTable(doc, rightPanelX, boxY, panelWidth, 'CLASS PERFORMANCE', classRows);
  const afterTables = Math.max(afterStudentTable, afterClassTable);

  // Attendance
  const acY = afterTables + 8;
  doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
  doc.text(
    `Attendance: ${extra.attendancePresent || 0} Present, ${extra.attendanceAbsent || 0} Absent (${extra.attendancePercentage || 0}%)`,
    startX, acY
  );

  // Conduct
  const conductY = acY + 10;
  const afterConduct = drawConductChecklist(doc, startX, conductY, PAGE.contentWidth, extra.conduct);

  // Signatures
  const sigY = afterConduct + 6;
  const afterSig = drawSignatureBlock(doc, sigY);

  doc.fontSize(4.5).font('Helvetica-BoldOblique').fillColor('#999999')
    .text(
      `Generated on ${new Date().toLocaleDateString()}`,
      startX, afterSig + 4,
      { width: PAGE.contentWidth, align: 'center' }
    );
}

module.exports = { generateReportCardPDF, COUNTRY };