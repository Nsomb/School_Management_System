// backend/controllers/feeController.js
const FeeModel = require('../models/feeModel');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { generateStudentStatement } = require('../services/statementService');
const {
  exportCollectionSummary,
  exportOutstandingBalances,
  exportPaymentsByDate,
} = require('../services/excelService');
const { logAudit } = require('../services/auditService');
const { getClientIp, getUserAgent } = require('../services/ipService');
const discountService = require('../services/discountService');
const { getCurrentAcademicYearAndTerm } = require('./academicYearController');
const { getSchoolConfig } = require('../services/schoolConfigCache');

// ─── HELPERS ────────────────────────────────────────────────
const getSchoolId = (req) => {
  const sid = req.schoolId || req.user?.schoolId;
  if (!sid) throw new Error('No school context available');
  return sid;
};

const handleControllerError = (res, error, message = 'An unexpected error occurred.') => {
  console.error(message, error);
  if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
  if (error.message.includes('already exists') || error.message.includes('exists.')) return res.status(409).json({ error: error.message });
  if (error.message.includes('Missing required') || error.message.includes('required')) return res.status(400).json({ error: error.message });
  res.status(500).json({ error: message });
};

// ============================================================================
// ACADEMIC YEAR
// ============================================================================

exports.getCurrentAcademicYear = async (req, res) => {
  try {
    const { academicYear } = getCurrentAcademicYearAndTerm();
    res.status(200).json({ academic_year: academicYear });
  } catch (error) {
    handleControllerError(res, error, 'Failed to get current academic year.');
  }
};

exports.getAllAcademicYears = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      const start = currentYear - i;
      years.push(`${start}/${start + 1}`);
    }
    res.status(200).json(years);
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve academic years.');
  }
};

// ============================================================================
// FEE STRUCTURE MANAGEMENT
// ============================================================================

exports.createFeeStructure = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { class_names, academic_year, term, description, due_date, components } = req.body;

    if (!Array.isArray(class_names) || class_names.length === 0) {
      throw new Error('Missing required field: class_names (must be a non-empty array).');
    }
    if (!academic_year || !term || !Array.isArray(components) || components.length === 0) {
      throw new Error('Missing required fields: academic_year, term, and at least one component.');
    }

    const classIds = [];
    for (const name of class_names) {
      const id = await FeeModel.findClassIdByName(name, schoolId);
      if (!id) throw new Error(`Class with name '${name}' not found.`);
      classIds.push(id);
    }

    for (const cId of classIds) {
      const existing = await FeeModel.findFeeStructure(cId, academic_year, term, schoolId);
      if (existing) throw new Error(`A fee structure already exists for class '${class_names[classIds.indexOf(cId)]}' in year '${academic_year}' and term '${term}'.`);
    }

    const feeStructureId = await FeeModel.createFeeStructureWithComponents(
      classIds, academic_year, term, description, due_date, components, schoolId
    );

    await logAudit({
      userId: req.user.id,
      action: 'FEE_STRUCTURE_CREATED',
      entityType: 'fee_structure',
      entityId: feeStructureId,
      newData: { class_names, academic_year, term, description, due_date, components },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      schoolId,
    });

    res.status(201).json({ message: 'Fee structure created successfully.', feeStructureId });
  } catch (error) {
    handleControllerError(res, error, 'Failed to create fee structure.');
  }
};

exports.updateFeeStructure = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const { description, due_date, components, class_names } = req.body;
    if (!id) return res.status(400).json({ error: 'Fee structure ID is required.' });

    const oldStructure = await FeeModel.findFeeStructureByIdWithComponents(id, schoolId);
    if (!oldStructure) throw new Error(`Fee structure with ID ${id} not found.`);

    let classIds = null;
    if (Array.isArray(class_names)) {
      classIds = [];
      for (const name of class_names) {
        const cId = await FeeModel.findClassIdByName(name, schoolId);
        if (!cId) throw new Error(`Class with name '${name}' not found.`);
        classIds.push(cId);
      }
    }

    const affectedRows = await FeeModel.updateFeeStructureAndComponentsById(
      id, description, due_date, components, classIds, schoolId
    );

    if (affectedRows > 0) {
      const newStructure = await FeeModel.findFeeStructureByIdWithComponents(id, schoolId);
      await logAudit({
        userId: req.user.id,
        action: 'FEE_STRUCTURE_UPDATED',
        entityType: 'fee_structure',
        entityId: id,
        oldData: oldStructure,
        newData: newStructure,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        schoolId,
      });
      res.status(200).json({ message: 'Fee structure updated successfully.' });
    } else {
      res.status(404).json({ message: 'Fee structure not found or no changes made.' });
    }
  } catch (error) {
    handleControllerError(res, error, 'Failed to update fee structure.');
  }
};

exports.deleteFeeStructure = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Fee structure ID is required.' });

    const structure = await FeeModel.findFeeStructureByIdWithComponents(id, schoolId);
    if (!structure) throw new Error(`Fee structure with ID ${id} not found.`);

    const deletedRows = await FeeModel.deleteFeeStructureById(id, schoolId);
    if (deletedRows > 0) {
      await logAudit({
        userId: req.user.id,
        action: 'FEE_STRUCTURE_DELETED',
        entityType: 'fee_structure',
        entityId: id,
        oldData: structure,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        schoolId,
      });
      res.status(200).json({ message: 'Fee structure deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Fee structure not found.' });
    }
  } catch (error) {
    handleControllerError(res, error, 'Failed to delete fee structure.');
  }
};

exports.getAllFeeStructures = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { classId, academicYear } = req.query;
    const feeStructures = await FeeModel.getAllFeeStructuresWithComponents(classId, academicYear, schoolId);
    res.status(200).json(feeStructures);
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve fee structures.');
  }
};

exports.getFeeStructureById = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const feeStructure = await FeeModel.findFeeStructureByIdWithComponents(id, schoolId);
    if (feeStructure) res.status(200).json(feeStructure);
    else res.status(404).json({ message: 'Fee structure not found.' });
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve fee structure.');
  }
};

// ============================================================================
// STUDENT SEARCH & DROPDOWNS
// ============================================================================

exports.searchStudents = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { name } = req.query;
    if (!name || name.length < 2) return res.status(400).json({ error: 'Search query must be at least 2 characters long.' });
    const students = await FeeModel.findStudentsByName(name, schoolId);
    res.status(200).json(students);
  } catch (error) { handleControllerError(res, error, 'Failed to search students.'); }
};

exports.getAllClasses = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const classes = await FeeModel.getAllClassesWithId(schoolId);
    res.status(200).json(classes);
  } catch (error) { handleControllerError(res, error, 'Failed to retrieve classes.'); }
};

exports.getStudentsByClass = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ error: 'Class ID is required.' });
    const students = await FeeModel.getStudentsByClass(classId, schoolId);
    res.status(200).json(students);
  } catch (error) { handleControllerError(res, error, 'Failed to retrieve students for class.'); }
};

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

exports.recordPayment = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const recordedByAdminId = req.user ? req.user.id : null;
    if (!recordedByAdminId) return res.status(401).json({ error: 'Unauthorized: Admin user not identified.' });

    const {
      student_identifier, class_name, academic_year, term,
      amount_paid, payment_date, payment_method, notes, reference_number, component_name,
    } = req.body;

    if (!student_identifier || !class_name || !academic_year || !term || amount_paid === undefined || !payment_date || !payment_method) {
      throw new Error('Missing required payment fields.');
    }

    const students = await FeeModel.findStudentsByName(student_identifier.trim(), schoolId);
    if (!students || students.length === 0) throw new Error(`Student with name '${student_identifier}' not found.`);
    const student = students[0];

    if (student.class_name.toLowerCase() !== class_name.toLowerCase().trim()) {
      throw new Error(`Student '${student.name}' is in class '${student.class_name}', not '${class_name}'.`);
    }

    const classId = await FeeModel.findClassIdByName(class_name.trim(), schoolId);
    if (!classId) throw new Error(`Class '${class_name}' not found.`);

    const feeStructure = await FeeModel.findFeeStructure(classId, academic_year.trim(), term, schoolId);
    if (!feeStructure) throw new Error(`Fee structure for class '${class_name}', year '${academic_year}', term '${term}' not found.`);

    const structureComponents = await FeeModel.findFeeStructureByIdWithComponents(feeStructure.id, schoolId);
    if (!structureComponents || !structureComponents.components || structureComponents.components.length === 0) {
      throw new Error('No fee components found for this structure.');
    }

    const compSummary = await FeeModel.getComponentPaymentSummary(student.id, feeStructure.id, schoolId);
    const compPaidMap = {};
    compSummary.forEach(row => { compPaidMap[row.component_name] = parseFloat(row.total_paid) || 0; });

    let targetComponent = null;
    if (component_name) {
      targetComponent = structureComponents.components.find(c => c.name === component_name);
      if (!targetComponent) throw new Error(`Component '${component_name}' not found in the fee structure.`);
    } else {
      targetComponent = structureComponents.components[0];
    }

    const compTotal = parseFloat(targetComponent.amount) || 0;
    const compPaid = compPaidMap[targetComponent.name] || 0;
    const compOutstanding = compTotal - compPaid;

    if (parseFloat(amount_paid) > compOutstanding) {
      throw new Error(`Payment exceeds outstanding balance for '${targetComponent.name}'. Outstanding: FCFA ${compOutstanding.toFixed(0)}`);
    }

    const totalFee = await FeeModel.getTotalFeeForStructure(feeStructure.id, schoolId);
    const discountInfo = await discountService.getEffectiveDiscount(student.id, academic_year.trim(), term, totalFee, schoolId);
    let studentDiscountId = null;
    if (discountInfo.appliedDiscounts.length > 0) studentDiscountId = discountInfo.appliedDiscounts[0].id;

    const { paymentId, receiptNumber, receiptPath } = await FeeModel.createPayment({
      student_id: student.id,
      fee_structure_id: feeStructure.id,
      amount_paid, payment_date, payment_method,
      recorded_by_admin_id: recordedByAdminId,
      notes, reference_number,
      student_discount_id: studentDiscountId,
      component_name: targetComponent.name,
    }, schoolId);

    await logAudit({
      userId: req.user.id,
      action: 'PAYMENT_CREATED',
      entityType: 'payment',
      entityId: paymentId,
      newData: { student_id: student.id, student_name: student.name, amount_paid, payment_date, payment_method, receipt_number: receiptNumber, discount_id: studentDiscountId },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      schoolId,
    });

    res.status(201).json({
      message: 'Payment recorded successfully.',
      paymentId, receiptNumber, receiptPath,
      receiptDownloadUrl: `/api/fees/receipts/${paymentId}`,
      discountApplied: discountInfo.appliedDiscounts,
    });
  } catch (error) { handleControllerError(res, error, 'Failed to record payment.'); }
};

// ============================================================================
// GET PAYMENTS / DETAILS / RECEIPT
// ============================================================================

exports.getPayments = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId, academicYear } = req.query;
    const payments = await FeeModel.getPayments({ studentId, academicYear }, schoolId);
    res.status(200).json(payments);
  } catch (error) { handleControllerError(res, error, 'Failed to retrieve payments.'); }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const payment = await FeeModel.getPaymentDetailsById(id, schoolId);
    if (payment) res.status(200).json(payment);
    else res.status(404).json({ message: 'Payment not found.' });
  } catch (error) { handleControllerError(res, error, 'Failed to retrieve payment details.'); }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { paymentId } = req.params;
    const paymentDetails = await FeeModel.getPaymentDetailsById(paymentId, schoolId);
    if (!paymentDetails) return res.status(404).json({ error: 'Payment not found.' });

    const { generateReceipt } = require('../services/receiptService');
    paymentDetails.school_id = schoolId;
    const relativePath = await generateReceipt(paymentDetails, paymentDetails.receipt_number);

    await db.tenantQuery(
      `UPDATE payments SET receipt_path = $1 WHERE id = $2 AND school_id = $3`,
      [relativePath, paymentId, schoolId],
      schoolId
    );

    const filePath = path.join(__dirname, '..', 'receipts', relativePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Failed to regenerate receipt.' });
    }

    res.download(filePath, `receipt_${paymentId}.pdf`, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Could not download the receipt.' });
      }
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to download receipt.');
  }
};

exports.voidPayment = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { paymentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required.' });
    if (!reason) return res.status(400).json({ error: 'Void reason is required.' });

    const paymentBefore = await FeeModel.getPaymentDetailsById(paymentId, schoolId);
    if (!paymentBefore) throw new Error('Payment not found.');

    const result = await FeeModel.voidPayment(paymentId, adminId, reason, schoolId);
    const paymentAfter = await FeeModel.getPaymentDetailsById(paymentId, schoolId);

    await logAudit({
      userId: req.user.id,
      action: 'PAYMENT_VOIDED',
      entityType: 'payment',
      entityId: paymentId,
      oldData: paymentBefore,
      newData: paymentAfter,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      schoolId,
    });
    res.status(200).json({ message: 'Payment voided successfully.', paymentId: result.paymentId });
  } catch (error) { handleControllerError(res, error, 'Failed to void payment.'); }
};

exports.reversePayment = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { paymentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required.' });
    if (!reason) return res.status(400).json({ error: 'Reversal reason is required.' });

    const paymentBefore = await FeeModel.getPaymentDetailsById(paymentId, schoolId);
    if (!paymentBefore) throw new Error('Payment not found.');

    const result = await FeeModel.reversePayment(paymentId, adminId, reason, schoolId);
    const paymentAfter = await FeeModel.getPaymentDetailsById(paymentId, schoolId);
    const reversalPayment = await FeeModel.getPaymentDetailsById(result.reversalId, schoolId);

    await logAudit({
      userId: req.user.id,
      action: 'PAYMENT_REVERSED',
      entityType: 'payment',
      entityId: paymentId,
      oldData: paymentBefore,
      newData: { original: paymentAfter, reversal: reversalPayment },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      schoolId,
    });
    res.status(200).json({ message: 'Payment reversed successfully.', originalId: result.originalId, reversalId: result.reversalId, receiptPath: result.receiptPath });
  } catch (error) { handleControllerError(res, error, 'Failed to reverse payment.'); }
};

// ============================================================================
// REPORTS
// ============================================================================

exports.getCollectionSummary = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const summary = await FeeModel.getTotalFeesCollectedByClassAndYear(academicYear, classId, schoolId);
    res.status(200).json(summary);
  } catch (error) { handleControllerError(res, error, 'Failed to get collection summary.'); }
};

exports.getOutstandingBalances = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const outstanding = await FeeModel.getOutstandingBalancesSchoolWide(academicYear, classId, schoolId);
    res.status(200).json(outstanding);
  } catch (error) { handleControllerError(res, error, 'Failed to get outstanding balances.'); }
};

exports.getPaymentsByDateRange = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { startDate, endDate, classId } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Start date and end date are required.' });
    const payments = await FeeModel.getPaymentsByDateRange(startDate, endDate, classId, schoolId);
    res.status(200).json(payments);
  } catch (error) { handleControllerError(res, error, 'Failed to get payments by date range.'); }
};

exports.getStudentFeeSummary = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId } = req.params;
    const { academicYear } = req.query;
    if (!studentId || !academicYear) return res.status(400).json({ error: 'Student ID and academic year are required.' });
    const summary = await FeeModel.getStudentFeeSummaryData(studentId, academicYear, schoolId);
    if (!summary.studentFound) return res.status(404).json({ message: 'Student not found.' });
    res.status(200).json(summary);
  } catch (error) { handleControllerError(res, error, 'Failed to get student fee summary.'); }
};

exports.getClassFeeSummary = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { classId } = req.params;
    const { academicYear, feeStructureId, componentName } = req.query;
    if (!classId || !academicYear || !feeStructureId) return res.status(400).json({ error: 'Class ID, academic year, and fee structure ID are required.' });
    const classSummary = await FeeModel.getClassFeeSummaryData(classId, academicYear, feeStructureId, componentName, schoolId);
    res.status(200).json(classSummary);
  } catch (error) { handleControllerError(res, error, 'Failed to get class fee summary.'); }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const stats = await FeeModel.getDashboardStats(academicYear, classId, schoolId);
    res.status(200).json(stats);
  } catch (error) { handleControllerError(res, error, 'Failed to get dashboard statistics.'); }
};

exports.downloadStudentStatement = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId } = req.params;
    const { academicYear } = req.query;
    if (!studentId || !academicYear) return res.status(400).json({ error: 'Student ID and academic year are required.' });
    const summary = await FeeModel.getStudentFeeSummaryData(studentId, academicYear, schoolId);
    if (!summary.studentFound) return res.status(404).json({ message: 'Student not found.' });
    const filePath = await generateStudentStatement(summary, studentId, schoolId);
    res.download(filePath, `statement_${summary.studentDetails.student_name.replace(/\s/g, '_')}.pdf`, (err) => {
      if (err && !res.headersSent) res.status(500).json({ error: 'Could not download statement.' });
    });
  } catch (error) { handleControllerError(res, error, 'Failed to generate student statement.'); }
};

// ============================================================================
// EXCEL EXPORTS
// ============================================================================

exports.exportCollectionSummaryExcel = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const school = await getSchoolConfig(schoolId);
    const data = await FeeModel.getTotalFeesCollectedByClassAndYear(academicYear, classId, schoolId);
    const buffer = await exportCollectionSummary(data, academicYear, school?.name || '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=collection_summary_${academicYear}.xlsx`);
    res.send(buffer);
  } catch (error) { handleControllerError(res, error, 'Failed to export collection summary.'); }
};

exports.exportOutstandingBalancesExcel = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const school = await getSchoolConfig(schoolId);
    const data = await FeeModel.getOutstandingBalancesSchoolWide(academicYear, classId, schoolId);
    const buffer = await exportOutstandingBalances(data, school?.name || '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=outstanding_balances_${academicYear}.xlsx`);
    res.send(buffer);
  } catch (error) { handleControllerError(res, error, 'Failed to export outstanding balances.'); }
};

exports.exportPaymentsByDateExcel = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Start date and end date are required.' });
    const school = await getSchoolConfig(schoolId);
    const data = await FeeModel.getPaymentsByDateRange(startDate, endDate, null, schoolId);
    const buffer = await exportPaymentsByDate(data, school?.name || '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payments_${startDate}_to_${endDate}.xlsx`);
    res.send(buffer);
  } catch (error) { handleControllerError(res, error, 'Failed to export payments.'); }
};

exports.exportFeeStructuresExcel = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { classId, academicYear } = req.query;
    const structures = await FeeModel.getAllFeeStructuresWithComponents(classId, academicYear, schoolId);
    if (!structures || structures.length === 0) return res.status(404).json({ error: 'No fee structures found.' });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fee Structures');
    worksheet.columns = [
      { header: 'Classes', key: 'classes_text', width: 30 },
      { header: 'Academic Year', key: 'academic_year', width: 15 },
      { header: 'Components', key: 'components_text', width: 40 },
      { header: 'Total Amount (FCFA)', key: 'total_amount', width: 20 },
      { header: 'Description', key: 'description', width: 25 },
      { header: 'Due Date', key: 'due_date', width: 15 },
    ];
    structures.forEach(row => {
      const classesText = (row.classes || []).map(c => c.name).join(', ');
      const componentsText = (row.components || []).map(c => `${c.name}: ${c.amount.toFixed(2)}`).join('; ');
      worksheet.addRow({
        classes_text: classesText,
        academic_year: row.academic_year,
        components_text: componentsText,
        total_amount: row.total_amount || 0,
        description: row.description || '',
        due_date: row.due_date ? new Date(row.due_date).toLocaleDateString() : '',
      });
    });
    worksheet.getColumn(4).numFmt = '#,##0.00';
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=fee_structures_${new Date().toISOString().slice(0,10)}.xlsx`);
    res.send(buffer);
  } catch (error) { handleControllerError(res, error, 'Failed to export fee structures.'); }
};

// ============================================================================
// AUDIT LOGS / DISCOUNTS / VERIFY / ADVANCED
// ============================================================================

exports.getAuditLogs = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { userId, action, entityType, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const result = await require('../services/auditService').getAuditLogs({
      userId: userId ? parseInt(userId) : null, action, entityType,
      startDate: startDate || null, endDate: endDate || null,
      limit: parseInt(limit) || 50, offset: parseInt(offset) || 0,
    }, schoolId);
    res.status(200).json({ logs: result, total: result.length });
  } catch (error) { handleControllerError(res, error, 'Failed to retrieve audit logs.'); }
};

exports.getAllDiscountTypes = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    res.status(200).json(await discountService.getAllDiscountTypes(schoolId));
  }
  catch (error) { handleControllerError(res, error, 'Failed to retrieve discount types.'); }
};

exports.createDiscountType = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, type, value, description } = req.body;
    if (!name || !type || value === undefined) throw new Error('Name, type, and value are required.');
    const id = await discountService.createDiscountType({ name, type, value, description }, schoolId);
    await logAudit({
      userId: req.user.id, action: 'DISCOUNT_TYPE_CREATED', entityType: 'discount_type', entityId: id,
      newData: { name, type, value, description },
      ipAddress: getClientIp(req), userAgent: getUserAgent(req), schoolId,
    });
    res.status(201).json({ message: 'Discount type created.', id });
  } catch (error) { handleControllerError(res, error, 'Failed to create discount type.'); }
};

exports.updateDiscountType = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const { name, type, value, description } = req.body;
    if (!name || !type || value === undefined) throw new Error('Name, type, and value are required.');
    const all = await discountService.getAllDiscountTypes(schoolId);
    const oldType = all.find(t => t.id == id);
    const success = await discountService.updateDiscountType(id, { name, type, value, description }, schoolId);
    if (!success) throw new Error('Discount type not found.');
    await logAudit({
      userId: req.user.id, action: 'DISCOUNT_TYPE_UPDATED', entityType: 'discount_type', entityId: id,
      oldData: oldType, newData: { name, type, value, description },
      ipAddress: getClientIp(req), userAgent: getUserAgent(req), schoolId,
    });
    res.status(200).json({ message: 'Discount type updated.' });
  } catch (error) { handleControllerError(res, error, 'Failed to update discount type.'); }
};

exports.deleteDiscountType = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const all = await discountService.getAllDiscountTypes(schoolId);
    const oldType = all.find(t => t.id == id);
    const success = await discountService.deleteDiscountType(id, schoolId);
    if (!success) throw new Error('Discount type not found.');
    await logAudit({
      userId: req.user.id, action: 'DISCOUNT_TYPE_DELETED', entityType: 'discount_type', entityId: id,
      oldData: oldType,
      ipAddress: getClientIp(req), userAgent: getUserAgent(req), schoolId,
    });
    res.status(200).json({ message: 'Discount type deleted.' });
  } catch (error) { handleControllerError(res, error, 'Failed to delete discount type.'); }
};

exports.verifyReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    if (!receiptNumber) return res.status(400).json({ error: 'Receipt number is required.' });
    const query = `
      SELECT p.id, p.receipt_number, p.amount_paid, p.payment_date, p.payment_method, p.status,
             s.name AS student_name, c.class_name, fs.academic_year, fs.term,
             a.username AS recorded_by_admin_username
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN fees_structure fs ON p.fee_structure_id = fs.id
      LEFT JOIN admins a ON p.recorded_by_admin_id = a.id
      WHERE p.receipt_number = $1
    `;
    const result = await db.query(query, [receiptNumber]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Receipt not found.' });
    res.status(200).json(result.rows[0]);
  } catch (error) { handleControllerError(res, error, 'Failed to verify receipt.'); }
};

exports.assignStudentDiscount = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId, discountTypeId, academicYear, term, notes } = req.body;
    if (!studentId || !discountTypeId || !academicYear || !term) throw new Error('Student ID, discount type ID, academic year, and term are required.');
    const id = await discountService.assignStudentDiscount({
      studentId, discountTypeId, academicYear, term, approvedBy: req.user.id, notes,
    }, schoolId);
    await logAudit({
      userId: req.user.id, action: 'STUDENT_DISCOUNT_ASSIGNED', entityType: 'student_discount', entityId: id,
      newData: { studentId, discountTypeId, academicYear, term, notes },
      ipAddress: getClientIp(req), userAgent: getUserAgent(req), schoolId,
    });
    res.status(201).json({ message: 'Discount assigned to student.', id });
  } catch (error) { handleControllerError(res, error, 'Failed to assign discount.'); }
};

exports.removeStudentDiscount = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const existing = await db.tenantQuery(
      'SELECT * FROM student_discounts WHERE id = $1 AND school_id = $2',
      [id, schoolId], schoolId
    );
    if (existing.rows.length === 0) throw new Error('Student discount not found.');
    const success = await discountService.removeStudentDiscount(id, schoolId);
    if (!success) throw new Error('Failed to remove.');
    await logAudit({
      userId: req.user.id, action: 'STUDENT_DISCOUNT_REMOVED', entityType: 'student_discount', entityId: id,
      oldData: existing.rows[0],
      ipAddress: getClientIp(req), userAgent: getUserAgent(req), schoolId,
    });
    res.status(200).json({ message: 'Student discount removed.' });
  } catch (error) { handleControllerError(res, error, 'Failed to remove student discount.'); }
};

exports.getStudentDiscounts = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId } = req.params;
    const { academicYear, term } = req.query;
    if (!studentId || !academicYear || !term) throw new Error('Student ID, academic year, and term are required.');
    const discounts = await discountService.getStudentDiscounts(studentId, academicYear, term, schoolId);
    res.status(200).json(discounts);
  } catch (error) { handleControllerError(res, error, 'Failed to get student discounts.'); }
};

exports.getDebtorsList = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId, componentName } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const data = await FeeModel.getDebtorsList(academicYear, classId, componentName, schoolId);
    res.status(200).json(data);
  } catch (error) { handleControllerError(res, error, 'Failed to get debtors list.'); }
};

exports.getClearedList = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYear, classId, componentName } = req.query;
    if (!academicYear) return res.status(400).json({ error: 'Academic year is required.' });
    const data = await FeeModel.getClearedList(academicYear, classId, componentName, schoolId);
    res.status(200).json(data);
  } catch (error) { handleControllerError(res, error, 'Failed to get cleared list.'); }
};

exports.getDailyCollections = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { date, classId } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    const data = await FeeModel.getDailyCollections(date, classId, schoolId);
    res.status(200).json(data);
  } catch (error) { handleControllerError(res, error, 'Failed to get daily collections.'); }
};

exports.getMonthlyCollections = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { yearMonth, classId } = req.query;
    if (!yearMonth) return res.status(400).json({ error: 'Year-month (YYYY-MM) is required.' });
    const data = await FeeModel.getMonthlyCollections(yearMonth, classId, schoolId);
    res.status(200).json(data);
  } catch (error) { handleControllerError(res, error, 'Failed to get monthly collections.'); }
};

exports.getAllStudentDiscounts = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const discounts = await discountService.getAllStudentDiscounts(req.query, schoolId);
    res.status(200).json(discounts);
  } catch (error) { handleControllerError(res, error, 'Failed to get all student discounts.'); }
};

exports.getStudentPayments = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ error: 'Student ID is required.' });
    const payments = await FeeModel.getStudentPayments(studentId, schoolId);
    res.status(200).json(payments);
  } catch (error) { handleControllerError(res, error, 'Failed to retrieve student payments.'); }
};