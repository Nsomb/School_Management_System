// utils/honourRollPdfGenerator.js
const { addClassHeader } = require('./classPdfHeader');

function generateHonourRollPDF(doc, data, school = {}) {
  const { studentInfo, summary, header } = data;

  // Use the shared bilingual header (country motto + ministry + region + school)
  const headerY = addClassHeader(
    doc,
    school,
    `HONOUR ROLL — ${header.term.toUpperCase()}`
  );

  let y = headerY + 30;
  const centreX = 300;

  // School motto (from schools table) — centered, above the certificate title
  const schoolMotto = school.motto_french || school.motto;
  if (schoolMotto) {
    doc.fontSize(9).font('Helvetica-BoldOblique').fillColor('#2e7d32');
    doc.text(schoolMotto, centreX, y, { align: 'center' });
    y += 24;
  }

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000')
    .text('CERTIFICATE OF EXCELLENCE', centreX, y, { align: 'center' });
  y += 20;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a4b8c')
    .text('HONOUR ROLL', centreX, y, { align: 'center' });
  y += 40;

  doc.fontSize(11).font('Helvetica').fillColor('#000000');
  const bodyX = 80;
  const bodyWidth = 440;

  doc.text('This certificate is proudly presented to', bodyX, y, { align: 'center', width: bodyWidth });
  y += 20;

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a4b8c')
    .text(studentInfo.name, bodyX, y, { align: 'center', width: bodyWidth });
  y += 20;

  doc.fontSize(11).font('Helvetica').fillColor('#000000')
    .text(`for obtaining an average of ${summary.termAverage} / 20`, bodyX, y, { align: 'center', width: bodyWidth });
  y += 20;

  doc.text(`during the ${header.term}`, bodyX, y, { align: 'center', width: bodyWidth });
  y += 10;
  doc.text(`Academic Year ${header.academicYear}`, bodyX, y, { align: 'center', width: bodyWidth });
  y += 30;

  doc.text('Keep striving for excellence.', bodyX, y, { align: 'center', width: bodyWidth });
  y += 60;

  // Signatures
  doc.fontSize(9).font('Helvetica').fillColor('#000000');
  const sigX = 100;
  const sigY = 660;
  doc.text('Principal Signature', sigX, sigY, { align: 'center' });
  doc.text('_________________', sigX, sigY + 10, { align: 'center' });
  doc.text('School Stamp', 450, sigY, { align: 'center' });
  doc.text('_________________', 450, sigY + 10, { align: 'center' });
}

module.exports = { generateHonourRollPDF };