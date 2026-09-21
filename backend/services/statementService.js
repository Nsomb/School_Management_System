// backend/services/statementService.js
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const { getSchoolConfig } = require('./schoolConfigCache');

// Country-level constants (hardcoded)
const COUNTRY = {
  nameEn: 'REPUBLIC OF CAMEROON',
  mottoEn: 'Peace – Work – Fatherland',
  defaultMinistryEn: 'MINISTRY OF SECONDARY EDUCATION',
};

async function generateStudentStatement(summary, studentId, schoolId) {
  if (!summary || !summary.studentFound) throw new Error('Student data not found.');

  const school = await getSchoolConfig(schoolId);
  const SCHOOL_NAME = school?.name || 'SCHOOL NAME';
  const SCHOOL_MOTTO = school?.motto_french || school?.motto || '';
  const SCHOOL_ADDRESS = school?.address || '';
  const SCHOOL_PHONE = school?.phone || '';
  const SCHOOL_EMAIL = school?.email || '';
  const SCHOOL_REGION = school?.region || '';
  const SCHOOL_DIVISION = school?.division || '';

  const { studentDetails, feeStructures, payments, totalPaid, totalExpected, outstandingBalance } = summary;

  const firstStructure = feeStructures && feeStructures.length > 0 ? feeStructures[0] : null;
  const academicYear = firstStructure?.academic_year || 'N/A';
  const term = firstStructure?.term || 'N/A';

  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const startY = 120;

  // ═══════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(COUNTRY.nameEn, pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(COUNTRY.mottoEn, pageWidth / 2, 56, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(9);
  doc.text(COUNTRY.defaultMinistryEn, pageWidth / 2, 72, { align: 'center' });

  if (SCHOOL_REGION) {
    doc.text(`REGIONAL DELEGATION OF ${SCHOOL_REGION.toUpperCase()}`, pageWidth / 2, 86, { align: 'center' });
  }
  if (SCHOOL_DIVISION) {
    doc.text(`DIVISIONAL DELEGATION OF ${SCHOOL_DIVISION.toUpperCase()}`, pageWidth / 2, 100, { align: 'center' });
  }

  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.text(SCHOOL_NAME, pageWidth / 2, startY, { align: 'center' });

  if (SCHOOL_MOTTO) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(46, 125, 50);
    doc.text(SCHOOL_MOTTO, pageWidth / 2, startY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }

  const contactLine = [SCHOOL_ADDRESS, SCHOOL_PHONE, SCHOOL_EMAIL].filter(Boolean).join(' • ');
  if (contactLine) {
    doc.setFontSize(8);
    doc.setTextColor(85, 85, 85);
    doc.text(contactLine, pageWidth / 2, startY + 28, { align: 'center' });
  }

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('FEE STATEMENT', pageWidth / 2, startY + 50, { align: 'center' });

  // ─── Student Info ───
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const infoStartY = startY + 80;
  doc.text(`Student: ${studentDetails.student_name}`, margin, infoStartY);
  doc.text(`Class: ${studentDetails.class_name}`, margin + 250, infoStartY);
  doc.text(`Academic Year: ${academicYear}`, margin, infoStartY + 20);
  doc.text(`Term: ${term}`, margin + 250, infoStartY + 20);

  // ─── Fee Structure Table ───
  const feeRows = [];
  if (feeStructures && feeStructures.length > 0) {
    feeStructures.forEach((fs) => {
      if (fs.components && fs.components.length > 0) {
        fs.components.forEach((comp) => {
          feeRows.push([comp.name || 'N/A', comp.amount.toFixed(2)]);
        });
      }
    });
  }
  const totalExpectedAmount = totalExpected || feeStructures.reduce((sum, fs) => sum + (fs.total_expected_amount || 0), 0);
  feeRows.push(['TOTAL EXPECTED', totalExpectedAmount.toFixed(2)]);

  autoTable(doc, {
    head: [['Component', 'Amount (FCFA)']],
    body: feeRows,
    startY: infoStartY + 40,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
  });

  // ─── Payment History Table ───
  const paymentRows = [];
  if (payments && payments.length > 0) {
    payments.forEach((p) => {
      paymentRows.push([
        new Date(p.payment_date).toLocaleDateString(),
        p.receipt_number || 'N/A',
        p.component_name || 'General',
        p.payment_method || 'N/A',
        p.amount_paid.toFixed(2),
      ]);
    });
  } else {
    paymentRows.push(['No payments recorded', '', '', '', '']);
  }
  const totalPaidAmount = totalPaid || 0;
  if (payments && payments.length > 0) {
    paymentRows.push(['', '', '', 'TOTAL PAID', totalPaidAmount.toFixed(2)]);
  }

  const firstTableFinalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : infoStartY + 150;
  autoTable(doc, {
    head: [['Date', 'Receipt #', 'Component', 'Method', 'Amount (FCFA)']],
    body: paymentRows,
    startY: firstTableFinalY + 20,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255] },
  });

  // ─── Outstanding Balance ───
  const secondTableFinalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : firstTableFinalY + 120;
  const summaryY = secondTableFinalY + 30;
  const balance = Math.max(0, outstandingBalance);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const boxX = pageWidth - margin - 250;
  const boxW = 250;
  const boxH = 40;
  doc.setFillColor(balance > 0 ? 255 : 220, balance > 0 ? 220 : 255, balance > 0 ? 220 : 220);
  doc.rect(boxX, summaryY, boxW, boxH, 'F');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('Outstanding Balance:', boxX + 10, summaryY + 20);
  doc.setFontSize(16);
  doc.setTextColor(balance > 0 ? 255 : 0, balance > 0 ? 0 : 150, 0);
  doc.text(`${balance.toFixed(2)} FCFA`, boxX + 200, summaryY + 20, { align: 'right' });

  // ─── Footer ───
  const finalFooterY = Math.max(summaryY + boxH + 30, doc.internal.pageSize.getHeight() - 40);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${new Date().toLocaleString()} | This is an official statement from ${SCHOOL_NAME}`,
    pageWidth / 2, finalFooterY, { align: 'center' }
  );

  // ─── Save ───
  const receiptsDir = path.join(__dirname, '..', 'receipts', `school_${schoolId}`);
  if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });
  const filename = `statement_${studentId}_${Date.now()}.pdf`;
  const filePath = path.join(receiptsDir, filename);

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(filePath, pdfBuffer);
  return filePath;
}

module.exports = { generateStudentStatement };