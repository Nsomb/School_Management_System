// ============================================================================
// COMPONENT & FEE STRUCTURE
// ============================================================================

export interface FeeComponent {
  id?: number;
  name: string;
  amount: number;
}

export interface FeeStructure {
  id: number;
  class_id: number;
  class_name: string;
  academic_year: string;
  term: string;
  description?: string;
  due_date?: string;
  components?: { name: string; amount: number }[];
  total_amount?: number;
}

// ============================================================================
// PAYMENT
// ============================================================================

export interface Payment {
  // ---- Internal / backend identifiers (never display these) ----
  id: number;
  student_id: number;
  class_id: number;
  /** FK to the fee structure — kept under the plural name to match the DB column */
  fees_structure_id: number;
  recorded_by: number;

  // ---- Display fields (safe to show in UI / PDF) ----
  student_name: string;
  class_name: string;
  academic_year: string;
  term: string;
  amount_paid: number;
  payment_date: string;
  receipt_number: string;
  payment_method: string;
  recorded_by_name: string;
  notes?: string;
  reference_number?: string;
  component_name?: string;
  receipt_path?: string;

  // ---- Status / soft-delete ----
  status?: 'active' | 'void' | 'reversed';
  void_reason?: string;
  voided_at?: string;
}

// ============================================================================
// STUDENT
// ============================================================================

export interface Student {
  id: number;
  name: string;
  admission_number?: string;
  class_id: number;
  class_name: string;
}

// ============================================================================
// CLASS
// ============================================================================

export interface ClassSummary {
  id: number;
  name: string; // matches backend 'class_name'
}

// ============================================================================
// ACADEMIC YEAR
// ============================================================================

export type AcademicYear = string; // backend returns an array of strings

// ============================================================================
// COLLECTION SUMMARY
// ============================================================================

export interface CollectionSummary {
  class_id: number;
  class_name: string;
  total_paid: number;
  total_expected: number;
  percentage_paid: number;
}

// ============================================================================
// OUTSTANDING BALANCE
// ============================================================================

export interface OutstandingBalance {
  student_id: number;
  student_name: string;
  class_name: string;
  total_paid: number;
  total_expected: number;
  balance: number;
}

// ============================================================================
// STUDENT FEE SUMMARY
// ============================================================================

export interface StudentFeeSummary {
  studentFound: boolean;
  studentDetails: {
    id: number;
    student_name: string;
    admission_number?: string;
    class_name: string;
  };
  feeStructure: {
    fees_structure_id: number;
    academic_year: string;
    term: string;
    description?: string;
    due_date?: string;
    total_expected_amount: number;
    components: FeeComponent[];
  } | null;
  payments: {
    payment_id: number;
    amount_paid: number;
    payment_date: string;
    receipt_number: string;
    payment_method: string;
    notes?: string;
    status?: string;
    recorded_by_admin?: string;
    component_name?: string;
  }[];
  totalPaid: number;
  outstandingBalance: number;
}

// ============================================================================
// CLASS FEE SUMMARY
// ============================================================================

export interface ClassFeeSummary {
  classDetails: {
    id: number;
    class_name: string;
  };
  feeStructure: {
    id: number;
    academic_year: string;
    term: string;
    description?: string;
    due_date?: string;
    total_expected_amount: number;
    components: FeeComponent[];
  };
  students: {
    student_id: number;
    student_name: string;
    admission_number?: string;
    total_paid: number;
    total_expected: number;
    outstanding_balance: number;
    payment_status: 'Paid' | 'Outstanding';
  }[];
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface DashboardStats {
  totalExpected: number;
  totalCollected: number;
  outstanding: number;
  collectionPercentage: number;
  studentsCleared: number;
  studentsOwing: number;
  todayCollected: number;
  monthCollected: number;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: number;
  user_id: number;
  user_username: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_data: any;
  new_data: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// ============================================================================
// DISCOUNTS & SCHOLARSHIPS
// ============================================================================

export interface DiscountType {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
  created_at: string;
}

export interface StudentDiscount {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  discount_type_id: number;
  discount_name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  academic_year: string;
  term: string;
  notes?: string;
  approved_by_username?: string;
  approved_at: string;
}

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque' | 'Mobile Money' | 'Other';
export type TermType = 'Term 1' | 'Term 2' | 'Term 3' | 'Annual';