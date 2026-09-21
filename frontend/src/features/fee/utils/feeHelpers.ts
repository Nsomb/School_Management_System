// ============================================================================
// TYPE DEFINITIONS (local to this file)
// ============================================================================

interface FeeComponent {
  id?: number;
  name: string;
  amount: number;
}

interface FeeClass {
  id: number;
  name: string;
}

interface FeeStructure {
  id?: number;
  /** Legacy single-class fields – kept for backward compatibility */
  class_id?: number;
  class_name?: string;
  /** New multi-class support */
  classes?: FeeClass[];
  academic_year: string;
  term: string;
  description?: string;
  due_date?: string;
  components: FeeComponent[];
  total_amount?: number;
}

interface Payment {
  id?: number;
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  /** FK to the fee structure – matches the DB column `fees_structure_id` */
  fees_structure_id: number;
  amount_paid: number;
  payment_date: string;
  receipt_number: string;
  payment_method: string;
  reference_number?: string;
  component_name?: string;
  academic_year?: string;
  term?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  notes?: string;
}

// ============================================================================
// CURRENCY FORMATTING – FCFA (XAF)
// ============================================================================

export const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 FCFA';
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatMoney = formatCurrency;

// ============================================================================
// NUMBER HELPERS
// ============================================================================

export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(n) ? 0 : n;
};

// ============================================================================
// DATE FORMATTING
// ============================================================================

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('fr-CM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ============================================================================
// CALCULATIONS – SAFE
// ============================================================================

export const calculateTotal = (components?: FeeComponent[] | null): number => {
  if (!components || !Array.isArray(components) || components.length === 0) return 0;
  return components.reduce((sum, comp) => sum + toNumber(comp.amount), 0);
};

/**
 * Returns a display string for the fee structure's classes.
 * Uses the multi-class array when available, falls back to the legacy single-class name.
 */
export const getClassLabel = (feeStructure: Partial<FeeStructure>): string => {
  if (Array.isArray(feeStructure.classes) && feeStructure.classes.length > 0) {
    return feeStructure.classes.map((c) => c.name).join(', ');
  }
  if (feeStructure.class_name) return feeStructure.class_name;
  if (feeStructure.class_id) return `Class ID: ${feeStructure.class_id}`;
  return 'N/A';
};

// ============================================================================
// RECEIPT HELPERS
// ============================================================================

export const generateReceiptNumber = (): string => {
  const date = new Date();
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${datePart}-${randomPart}`;
};

/**
 * Build the payload the backend receipt generator expects.
 *
 * NOTE: The frontend uses `fees_structure_id` (plural, matching the DB column),
 *       but the backend generator reads `fee_structure_id` (singular).
 *       We remap it here so both sides stay happy.
 *
 * IDs are included ONLY for the backend — they are never printed on the PDF.
 */
export const getReceiptData = (payment: Payment, feeStructure?: FeeStructure) => {
  const components = (feeStructure?.components || []).map((c) => ({
    name: c.name,
    amount: toNumber(c.amount),
  }));

  return {
    // ---- Backend identifiers (never rendered) ----
    student_id: payment.student_id,
    class_id: payment.class_id,
    fee_structure_id: payment.fees_structure_id, // ✅ singular – remapped for backend

    // ---- Display fields (safe for PDF) ----
    receiptNumber: payment.receipt_number,
    date: formatDate(payment.payment_date),

    student_name: payment.student_name,
    class_name: payment.class_name,
    academic_year: payment.academic_year || '',
    term: payment.term || '',

    amount_paid: toNumber(payment.amount_paid),
    payment_method: payment.payment_method,
    reference_number: payment.reference_number || null,
    payment_date: payment.payment_date,
    component_name: payment.component_name || null,
    notes: payment.notes || null,
    recorded_by_admin_username: payment.recorded_by_name || 'N/A',

    // ---- Fee components ----
    components,
    totalAmount: calculateTotal(feeStructure?.components),
  };
};

// ============================================================================
// FORM VALIDATION
// ============================================================================

/**
 * Validate a fee structure (multi-class aware).
 * Accepts either the new `classes[]` array or the legacy single `class_id`.
 */
export const validateFeeStructure = (data: Partial<FeeStructure>): string[] => {
  const errors: string[] = [];

  const hasClasses =
    (Array.isArray(data.classes) && data.classes.length > 0) ||
    !!data.class_id;

  if (!hasClasses) errors.push('At least one class is required');
  if (!data.academic_year) errors.push('Academic year is required');
  if (!data.term) errors.push('Term is required');

  if (!data.components || data.components.length === 0) {
    errors.push('At least one fee component is required');
  } else {
    data.components.forEach((comp: FeeComponent, index: number) => {
      if (!comp.name) errors.push(`Component ${index + 1}: Name is required`);
      if (typeof comp.amount !== 'number' || comp.amount <= 0) {
        errors.push(`Component ${index + 1}: Valid amount is required`);
      }
    });
  }

  return errors;
};

export const validatePayment = (data: Partial<Payment>): string[] => {
  const errors: string[] = [];
  if (!data.student_id) errors.push('Student is required');
  if (!data.fees_structure_id) errors.push('Fee structure is required');
  if (typeof data.amount_paid !== 'number' || data.amount_paid <= 0) {
    errors.push('Valid amount is required');
  }
  if (!data.payment_date) errors.push('Payment date is required');
  if (!data.payment_method) errors.push('Payment method is required');
  return errors;
};

// ============================================================================
// INITIAL STATE HELPERS
// ============================================================================

export const getInitialFeeStructure = (): Omit<FeeStructure, 'id'> => ({
  classes: [],
  academic_year: '',
  term: 'Annual', // Fee module always uses 'Annual'
  description: '',
  due_date: '',
  components: [],
});

export const getInitialPayment = (): Omit<Payment, 'id'> => ({
  student_id: 0,
  student_name: '',
  class_id: 0,
  class_name: '',
  fees_structure_id: 0,
  amount_paid: 0,
  payment_date: new Date().toISOString().split('T')[0],
  receipt_number: '',
  payment_method: 'Cash',
  recorded_by: 0,
  recorded_by_name: '',
  notes: '',
});