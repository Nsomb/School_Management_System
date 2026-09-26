// backend/services/receiptService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { getSchoolConfig } = require('./schoolConfigCache');

const RECEIPTS_BASE = path.join(__dirname, '..', 'receipts');

// ─── Resolve the school logo path on disk ───
// Handles both "/uploads/schools/logo.png" and "uploads/schools/logo.png"
function resolveLogoPath(logoUrl) {
  if (!logoUrl) return null;
  const cleanUrl = logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl;
  const absolute = path.join(__dirname, '..', cleanUrl);
  return fs.existsSync(absolute) ? absolute : null;
}

function ensureDirectory(schoolId, academicYear, term) {
  const year = academicYear.split(/[-\/]/)[0];
  const termFolder = (term || 'Term').replace(/\s/g, '');
  const dir = path.join(RECEIPTS_BASE, `school_${schoolId}`, year, termFolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Fetch per-component paid totals for a student's fee structure.
 *
 * RLS CONTEXT IS CRITICAL:
 *   - When called during payment creation, we pass a transaction `client`
 *     that already has `app.current_school_id` set via set_config().
 *   - When called during a receipt RE-download, we have no transaction;
 *     we must use `db.tenantQuery()` which sets the RLS context.
 *
 * Without the RLS context, this query silently returns 0 rows and the
 * receipt shows 0.00 paid across all components.
 */
async function getComponentSummary(studentId, feesStructureId, schoolId, queryRunner = null) {
  const query = `
    SELECT COALESCE(component_name, 'General') AS component_name,
           SUM(amount_paid) AS total_paid
    FROM payments
    WHERE student_id = $1 AND fee_structure_id = $2 AND status = 'active' AND school_id = $3
    GROUP BY component_name
  `;
  const params = [studentId, feesStructureId, schoolId];

  const result = queryRunner
    ? await queryRunner.query(query, params)
    : await db.tenantQuery(query, params, schoolId);

  return result.rows;
}

async function generateReceipt(details, receiptNumber, client = null) {
  const {
    student_id, fee_structure_id, academic_year,
    student_name, class_name, components, amount_paid,
    payment_method, reference_number, payment_date,
    recorded_by_admin_username, notes, component_name: paid_component_name,
    school_id,
  } = details;

  // Defensive term resolution (accept both `term` and legacy `fee_term`)
  const term = details.term || details.fee_term || 'Term';

  const school = await getSchoolConfig(school_id);
  const SCHOOL_NAME = school?.name || 'SCHOOL NAME';
  const SCHOOL_MOTTO = school?.motto_french || school?.motto || '';
  const SCHOOL_ADDRESS = school?.address || '';
  const SCHOOL_PHONE = school?.phone || '';
  const SCHOOL_EMAIL = school?.email || '';
  const LOGO_PATH = resolveLogoPath(school?.logo_url);

  const currentPaid = parseFloat(amount_paid) || 0;
  const queryRunner = client || null;

  const compSummary = await getComponentSummary(student_id, fee_structure_id, school_id, queryRunner);
  const compMap = {};
  compSummary.forEach(row => { compMap[row.component_name] = parseFloat(row.total_paid) || 0; });

  const year = academic_year.split(/[-\/]/)[0];
  const dir = ensureDirectory(school_id, academic_year, term);
  const filename = `${receiptNumber}.pdf`;
  const filePath = path.join(dir, filename);
  const relativePath = path.join(`school_${school_id}`, year, (term || 'Term').replace(/\s/g, ''), filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30, info: { Title: `Receipt ${receiptNumber}` } });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ═══════════════════════════════════════════════════════════
    // HEADER — logo + school name + motto + contact
    // (country / ministry / delegation lines removed)
    // ═══════════════════════════════════════════════════════════

    // ─── School logo (small, centered, at the top) ───
    const LOGO_SIZE = 42;
    const pageCenterX = 30 + (595 - 60) / 2; // 30 margin on each side → content width 535
    const logoX = pageCenterX - LOGO_SIZE / 2;
    const logoY = doc.y;

    if (LOGO_PATH) {
      try {
        doc.image(LOGO_PATH, logoX, logoY, { width: LOGO_SIZE, height: LOGO_SIZE });
        doc.y = logoY + LOGO_SIZE + 6; // reserve the vertical space
      } catch (e) {
        // If the image can't be embedded, just skip it and keep flowing
      }
    }

    // ─── School name ───
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
      .text(SCHOOL_NAME, { align: 'center' });

    // ─── School motto (green, italic) ───
    if (SCHOOL_MOTTO) {
      doc.fontSize(8).font('Helvetica-BoldOblique').fillColor('#2e7d32')
        .text(SCHOOL_MOTTO, { align: 'center' });
    }

    // ─── Contact line ───
    const contactLine = [SCHOOL_ADDRESS, SCHOOL_PHONE, SCHOOL_EMAIL].filter(Boolean).join(' • ');
    if (contactLine) {
      doc.fontSize(7).font('Helvetica').fillColor('#555555')
        .text(contactLine, { align: 'center' });
    }

    doc.moveDown(0.5);

    // ─── Receipt title ───
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a4b8c')
      .text('FEE PAYMENT RECEIPT', { align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#000000')
      .text(`Receipt #: ${receiptNumber}`, { align: 'right' });
    doc.moveDown(0.5);

    // ─── Student & Payment Info ───
    doc.fontSize(9).font('Helvetica');
    const col1 = 40, col2 = 280;
    let y = doc.y;

    doc.font('Helvetica-Bold').text(`Student: ${student_name}`, col1, y);
    doc.font('Helvetica').text(`Class: ${class_name}`, col2, y);
    y += 12;
    doc.text(`Academic Year: ${academic_year}`, col1, y);
    doc.text(`Term: ${term}`, col2, y);
    y += 12;
    doc.text(`Payment Date: ${new Date(payment_date).toLocaleDateString()}`, col1, y);
    if (paid_component_name) {
      doc.font('Helvetica-Bold');
      doc.text(`Component Paid: ${paid_component_name} – ${currentPaid.toFixed(2)} FCFA`, col2, y);
      doc.font('Helvetica');
    }
    doc.moveDown(1);

    // ─── Table ───
    const tableTop = doc.y + 3;
    const colPositions = [40, 160, 260, 360, 450];
    const colWidths = [115, 95, 95, 85, 70];

    doc.fontSize(8);
    doc.text('Component', colPositions[0], tableTop);
    doc.text('Total (FCFA)', colPositions[1], tableTop, { width: colWidths[1], align: 'right' });
    doc.text('Paid (FCFA)', colPositions[2], tableTop, { width: colWidths[2], align: 'right' });
    doc.text('Outstanding (FCFA)', colPositions[3], tableTop, { width: colWidths[3], align: 'right' });
    doc.moveDown();

    const lineY = doc.y;
    doc.moveTo(40, lineY).lineTo(560, lineY).stroke();
    doc.moveDown(0.5);

    let totalCompExpected = 0;
    let totalCompPaid = 0;
    if (components && components.length) {
      components.forEach(comp => {
        const compAmount = parseFloat(comp.amount) || 0;
        const compPaid = compMap[comp.name] || 0;
        const compOutstanding = compAmount - compPaid;
        totalCompExpected += compAmount;
        totalCompPaid += compPaid;
        const rowY = doc.y;
        doc.text(comp.name, colPositions[0], rowY);
        doc.text(compAmount.toFixed(2), colPositions[1], rowY, { width: colWidths[1], align: 'right' });
        doc.text(compPaid.toFixed(2), colPositions[2], rowY, { width: colWidths[2], align: 'right' });
        doc.text(compOutstanding.toFixed(2), colPositions[3], rowY, { width: colWidths[3], align: 'right' });
        doc.moveDown(0.3);
      });
    }

    const totalCompOutstanding = totalCompExpected - totalCompPaid;
    doc.moveDown(0.5);
    const rowY = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('TOTAL', colPositions[0], rowY);
    doc.text(totalCompExpected.toFixed(2), colPositions[1], rowY, { width: colWidths[1], align: 'right' });
    doc.text(totalCompPaid.toFixed(2), colPositions[2], rowY, { width: colWidths[2], align: 'right' });
    doc.text(totalCompOutstanding.toFixed(2), colPositions[3], rowY, { width: colWidths[3], align: 'right' });
    doc.font('Helvetica');
    doc.moveDown(1);

    // ─── Payment Details ───
    const detailY = doc.y;
    doc.fontSize(8);
    const labelX = 40, valueX = 120, labelX2 = 280, valueX2 = 360;
    let dy = detailY;

    doc.text('Payment Method:', labelX, dy);
    doc.text(payment_method, valueX, dy);
    if (reference_number) {
      doc.text('Reference:', labelX2, dy);
      doc.text(reference_number, valueX2, dy);
    }
    dy += 14;
    doc.text('Recorded By:', labelX, dy);
    doc.text(recorded_by_admin_username || 'N/A', valueX, dy);
    doc.text('Date:', labelX2, dy);
    doc.text(new Date(payment_date).toLocaleDateString(), valueX2, dy);
    dy += 14;
    if (notes) { doc.text('Notes:', labelX, dy); doc.text(notes, valueX, dy); }

    doc.end();
    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}

module.exports = { generateReceipt };