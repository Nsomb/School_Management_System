// backend/services/excelService.js
const ExcelJS = require('exceljs');

/**
 * Every export function accepts an optional `schoolName` string.
 * If omitted, falls back to a generic label so nothing crashes.
 */
const getSchoolName = (schoolName) => schoolName || 'School Management System';

// ─── Collection Summary ──────────────────────────────────
const exportCollectionSummary = async (data, academicYear, schoolName = '') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Collection Summary');

  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = getSchoolName(schoolName);
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:D2');
  worksheet.getCell('A2').value = `Fee Collection Summary – ${academicYear}`;
  worksheet.getCell('A2').font = { size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['Class', 'Total Expected (FCFA)', 'Total Collected (FCFA)', 'Percentage Paid (%)']);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86C1' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  data.forEach(row => {
    const totalExpected = Number(row.total_expected) || 0;
    const totalPaid = Number(row.total_paid) || 0;
    const percentage = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;
    worksheet.addRow([row.class_name, totalExpected, totalPaid, percentage]);
  });

  const totalExpectedAll = data.reduce((sum, r) => sum + (Number(r.total_expected) || 0), 0);
  const totalPaidAll = data.reduce((sum, r) => sum + (Number(r.total_paid) || 0), 0);
  const totalPercentageAll = totalExpectedAll > 0 ? (totalPaidAll / totalExpectedAll) * 100 : 0;

  const totalRow = worksheet.addRow(['Overall', totalExpectedAll, totalPaidAll, totalPercentageAll]);
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 18;
  worksheet.getColumn(2).numFmt = '#,##0.00';
  worksheet.getColumn(3).numFmt = '#,##0.00';
  worksheet.getColumn(4).numFmt = '0.00';

  const footerRow = worksheet.addRow([]);
  footerRow.addCell('A1').value = `Generated on ${new Date().toLocaleString()}`;
  footerRow.getCell(1).font = { size: 8, color: { argb: 'FF808080' } };
  worksheet.mergeCells(`A${worksheet.rowCount}:D${worksheet.rowCount}`);
  worksheet.getCell(`A${worksheet.rowCount}`).alignment = { horizontal: 'center' };

  return workbook.xlsx.writeBuffer();
};

// ─── Outstanding Balances ────────────────────────────────
const exportOutstandingBalances = async (data, schoolName = '') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Outstanding Balances');

  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = getSchoolName(schoolName);
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = 'Outstanding Balances';
  worksheet.getCell('A2').font = { size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['Student', 'Class', 'Expected (FCFA)', 'Paid (FCFA)', 'Balance (FCFA)']);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86C1' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  data.forEach(row => {
    const totalExpected = Number(row.total_expected) || 0;
    const totalPaid = Number(row.total_paid) || 0;
    const balance = Math.max(0, Number(row.balance) || (totalExpected - totalPaid));
    worksheet.addRow([row.student_name, row.class_name, totalExpected, totalPaid, balance]);
  });

  worksheet.getColumn(1).width = 25;
  worksheet.getColumn(2).width = 15;
  worksheet.getColumn(3).width = 18;
  worksheet.getColumn(4).width = 18;
  worksheet.getColumn(5).width = 18;
  worksheet.getColumn(3).numFmt = '#,##0.00';
  worksheet.getColumn(4).numFmt = '#,##0.00';
  worksheet.getColumn(5).numFmt = '#,##0.00';

  const footerRow = worksheet.addRow([]);
  footerRow.addCell('A1').value = `Generated on ${new Date().toLocaleString()}`;
  footerRow.getCell(1).font = { size: 8, color: { argb: 'FF808080' } };
  worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);
  worksheet.getCell(`A${worksheet.rowCount}`).alignment = { horizontal: 'center' };

  return workbook.xlsx.writeBuffer();
};

// ─── Payments by Date ────────────────────────────────────
const exportPaymentsByDate = async (data, schoolName = '') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payments by Date');

  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = getSchoolName(schoolName);
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = 'Payments by Date';
  worksheet.getCell('A2').font = { size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['Date', 'Student', 'Class', 'Amount (FCFA)', 'Receipt #', 'Method']);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86C1' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  data.forEach(payment => {
    worksheet.addRow([
      payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '',
      payment.student_name || '',
      payment.class_name || '',
      Number(payment.amount_paid) || 0,
      payment.receipt_number || '',
      payment.payment_method || '',
    ]);
  });

  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 25;
  worksheet.getColumn(3).width = 15;
  worksheet.getColumn(4).width = 18;
  worksheet.getColumn(5).width = 18;
  worksheet.getColumn(6).width = 15;
  worksheet.getColumn(4).numFmt = '#,##0.00';

  const footerRow = worksheet.addRow([]);
  footerRow.addCell('A1').value = `Generated on ${new Date().toLocaleString()}`;
  footerRow.getCell(1).font = { size: 8, color: { argb: 'FF808080' } };
  worksheet.mergeCells(`A${worksheet.rowCount}:F${worksheet.rowCount}`);
  worksheet.getCell(`A${worksheet.rowCount}`).alignment = { horizontal: 'center' };

  return workbook.xlsx.writeBuffer();
};

module.exports = { exportCollectionSummary, exportOutstandingBalances, exportPaymentsByDate };