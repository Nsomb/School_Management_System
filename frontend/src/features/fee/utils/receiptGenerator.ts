import { formatDate } from './feeHelpers';
import type { Payment, FeeStructure } from '../types/feeTypes';

/**
 * Generate a unique receipt number.
 * Format: RCP-YYMMDD-XXXX
 */
export const generateReceiptNumber = (): string => {
  const date = new Date();
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${datePart}-${randomPart}`;
};

/**
 * Safely convert a value to a number.
 * Handles strings like "15000.50" and null/undefined.
 */
export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(n) ? 0 : n;
};

/**
 * Sum up the components of a fee structure.
 * Each component's `amount` may be a number or a numeric string.
 */
export const calculateTotal = (components: { amount: number | string }[] | undefined): number => {
  if (!components || !Array.isArray(components)) return 0;
  return components.reduce((sum, comp) => sum + toNumber(comp.amount), 0);
};

/**
 * Extract the data the backend receipt generator needs.
 */
export const getReceiptData = (payment: Payment, feeStructure?: FeeStructure) => {
  // Normalise components to ensure `amount` is a number
  const components = (feeStructure?.components || []).map((c) => ({
    name: c.name,
    amount: toNumber(c.amount),
  }));

  return {
    // ---- Identifiers ----
    receiptNumber: payment.receipt_number,
    student_id: payment.student_id,
    // ✅ FIXED: use the plural form that exists on Payment
    fee_structure_id: payment.fees_structure_id,

    // ---- Student / class ----
    student_name: payment.student_name,
    class_name: payment.class_name,

    // ---- Academic info ----
    academic_year: payment.academic_year,
    term: payment.term,

    // ---- Payment info ----
    amount_paid: toNumber(payment.amount_paid),
    payment_method: payment.payment_method,
    reference_number: payment.reference_number || null,
    payment_date: payment.payment_date,
    component_name: payment.component_name || null,
    notes: payment.notes || null,

    // ---- Who recorded it ----
    recorded_by_admin_username: payment.recorded_by_name || 'N/A',

    // ---- Components (already numeric) ----
    components,
    totalAmount: calculateTotal(feeStructure?.components),

    // ---- Convenience for UI display ----
    date: formatDate(payment.payment_date),
  };
};