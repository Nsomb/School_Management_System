const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { verifyAdmin } = require('../middleware/auth');
const { requireBursar } = require('../middleware/auth');

// All fee routes require authentication + bursar role
router.use(verifyAdmin, requireBursar);

// ✅ Academic Year (delegates to academicYearController – single source of truth)
router.get('/current-academic-year', feeController.getCurrentAcademicYear);
router.get('/academic-years', feeController.getAllAcademicYears);

// Fee Structure
router.post('/structures', feeController.createFeeStructure);
router.get('/structures', feeController.getAllFeeStructures);
router.get('/structures/export', feeController.exportFeeStructuresExcel);
router.get('/structures/:id', feeController.getFeeStructureById);
router.put('/structures/:id', feeController.updateFeeStructure);
router.delete('/structures/:id', feeController.deleteFeeStructure);

// Payments
router.post('/payments', feeController.recordPayment);
router.get('/payments', feeController.getPayments);
router.get('/payments/:paymentId', feeController.getPaymentDetails);
router.get('/receipts/:paymentId', feeController.downloadReceipt);
router.post('/payments/:paymentId/void', feeController.voidPayment);
router.post('/payments/:paymentId/reverse', feeController.reversePayment);

// Reports
router.get('/reports/collection-summary', feeController.getCollectionSummary);
router.get('/reports/outstanding-balances', feeController.getOutstandingBalances);
router.get('/reports/payments-by-date', feeController.getPaymentsByDateRange);
router.get('/reports/student-summary/:studentId', feeController.getStudentFeeSummary);
router.get('/reports/class-summary/:classId', feeController.getClassFeeSummary);
router.get('/reports/dashboard-stats', feeController.getDashboardStats);

// Excel Exports
router.get('/reports/collection-summary/export', feeController.exportCollectionSummaryExcel);
router.get('/reports/outstanding-balances/export', feeController.exportOutstandingBalancesExcel);
router.get('/reports/payments-by-date/export', feeController.exportPaymentsByDateExcel);

// Student Statement (PDF)
router.get('/students/:studentId/statement', feeController.downloadStudentStatement);

// Audit Logs
router.get('/audit-logs', feeController.getAuditLogs);

// Public endpoints (no authentication)
router.get('/classes', feeController.getAllClasses);
router.get('/students/search', feeController.searchStudents);

// Discount Types
router.get('/discount-types', feeController.getAllDiscountTypes);
router.post('/discount-types', feeController.createDiscountType);
router.put('/discount-types/:id', feeController.updateDiscountType);
router.delete('/discount-types/:id', feeController.deleteDiscountType);

// Student Discount Assignments
router.post('/student-discounts', feeController.assignStudentDiscount);
router.delete('/student-discounts/:id', feeController.removeStudentDiscount);
router.get('/students/:studentId/discounts', feeController.getStudentDiscounts);
router.get('/student-discounts', feeController.getAllStudentDiscounts);
router.get('/verify-receipt/:receiptNumber', feeController.verifyReceipt);
router.get('/students/by-class/:classId', feeController.getStudentsByClass);

// Advanced Reports
router.get('/reports/debtors', feeController.getDebtorsList);
router.get('/reports/cleared', feeController.getClearedList);
router.get('/reports/daily-collections', feeController.getDailyCollections);
router.get('/reports/monthly-collections', feeController.getMonthlyCollections);

// Student Payment History
router.get('/students/:studentId/payments', feeController.getStudentPayments);

module.exports = router;