// src/features/fee/api/feeService.ts
import apiClient from '../../../api/AuthService';
import type {
  FeeStructure,
  Payment,
  Student,
  ClassSummary,
  AcademicYear,
  CollectionSummary,
  OutstandingBalance,
  StudentFeeSummary,
  ClassFeeSummary,
  FeeComponent,
  AuditLog,
  DiscountType,
  StudentDiscount,
} from '../types/feeTypes';

const API_BASE_URL = '/api/fees';

const handleApiError = (error: any): never => {
  if (error?.response?.data?.error) throw new Error(error.response.data.error);
  if (error?.response?.statusText) throw new Error(error.response.statusText);
  if (error?.request) throw new Error('No response received from server');
  throw error instanceof Error ? error : new Error('An unexpected error occurred');
};

// ============================================================================
// ACADEMIC YEAR
// ============================================================================

export const getCurrentAcademicYear = async (): Promise<string> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/current-academic-year`);
    return response.data?.academic_year || '';
  } catch (error) {
    return handleApiError(error);
  }
};

export const getAllAcademicYears = async (): Promise<AcademicYear[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/academic-years`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// FEE STRUCTURE
// ============================================================================

export const createFeeStructure = async (data: {
  class_names: string[];
  academic_year: string;
  term: string;
  description?: string;
  due_date?: string;
  components: FeeComponent[];
}): Promise<{ feeStructureId: number }> => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/structures`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getAllFeeStructures = async (
  classId?: number,
  academicYear?: string
): Promise<FeeStructure[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/structures`, {
      params: { classId, academicYear },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getFeeStructureById = async (id: number): Promise<FeeStructure> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/structures/${id}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateFeeStructure = async (
  id: number,
  data: {
    description?: string;
    due_date?: string;
    components: FeeComponent[];
    class_names?: string[];
  }
): Promise<void> => {
  try {
    await apiClient.put(`${API_BASE_URL}/structures/${id}`, data);
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteFeeStructure = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`${API_BASE_URL}/structures/${id}`);
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// STUDENT
// ============================================================================

export const searchStudents = async (name: string): Promise<Student[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/students/search`, {
      params: { name },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getStudentDetails = async (studentId: number): Promise<Student> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/students/${studentId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// CLASS
// ============================================================================

export const getAllClasses = async (): Promise<ClassSummary[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/classes`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getClassDetails = async (classId: number): Promise<ClassSummary> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/classes/${classId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// PAYMENTS
// ============================================================================

export const recordPayment = async (data: {
  student_identifier: string;
  class_name: string;
  academic_year: string;
  term: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number?: string;
  notes?: string;
  reference_number?: string;
  component_name?: string;
}): Promise<{
  paymentId: number;
  receiptNumber: string;
  receiptFilename: string;
  receiptDownloadUrl: string;
}> => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/payments`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPayments = async (
  studentId?: number,
  academicYear?: string
): Promise<Payment[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/payments`, {
      params: { studentId, academicYear },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPaymentDetails = async (id: number): Promise<Payment> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/payments/${id}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const downloadReceipt = async (paymentId: number): Promise<Blob> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/receipts/${paymentId}`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const voidPayment = async (
  paymentId: number,
  reason: string
): Promise<{ message: string; paymentId: number }> => {
  try {
    const response = await apiClient.post(
      `${API_BASE_URL}/payments/${paymentId}/void`,
      { reason }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const reversePayment = async (
  paymentId: number,
  reason: string
): Promise<{
  message: string;
  originalId: number;
  reversalId: number;
  receiptPath: string;
}> => {
  try {
    const response = await apiClient.post(
      `${API_BASE_URL}/payments/${paymentId}/reverse`,
      { reason }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// REPORTS
// ============================================================================

export const getCollectionSummary = async (
  academicYear: string,
  classId?: number
): Promise<CollectionSummary[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/collection-summary`, {
      params: { academicYear, classId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getOutstandingBalances = async (
  academicYear: string,
  classId?: number
): Promise<OutstandingBalance[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/outstanding-balances`, {
      params: { academicYear, classId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPaymentsByDateRange = async (
  startDate: string,
  endDate: string,
  classId?: number
): Promise<Payment[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/payments-by-date`, {
      params: { startDate, endDate, classId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getStudentFeeSummary = async (
  studentId: number,
  academicYear: string
): Promise<StudentFeeSummary> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/reports/student-summary/${studentId}`,
      { params: { academicYear } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getClassFeeSummary = async (
  classId: number,
  academicYear: string,
  feeStructureId: number,
  componentName?: string
): Promise<ClassFeeSummary> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/reports/class-summary/${classId}`,
      { params: { academicYear, feeStructureId, componentName } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getDashboardStats = async (
  academicYear: string,
  classId?: number
): Promise<any> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/dashboard-stats`, {
      params: { academicYear, classId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const downloadStudentStatement = async (
  studentId: number,
  academicYear: string
): Promise<Blob> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/students/${studentId}/statement`,
      { params: { academicYear }, responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// EXCEL EXPORTS
// ============================================================================

export const exportCollectionSummary = async (
  academicYear: string,
  classId?: number
): Promise<Blob> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/reports/collection-summary/export`,
      { params: { academicYear, classId }, responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const exportOutstandingBalances = async (
  academicYear: string,
  classId?: number
): Promise<Blob> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/reports/outstanding-balances/export`,
      { params: { academicYear, classId }, responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const exportPaymentsByDate = async (
  startDate: string,
  endDate: string
): Promise<Blob> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/reports/payments-by-date/export`,
      { params: { startDate, endDate }, responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const exportFeeStructuresExcel = async (classId?: number): Promise<Blob> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/structures/export`, {
      params: { classId },
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// DISCOUNT TYPES
// ============================================================================

export const getDiscountTypes = async (): Promise<DiscountType[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/discount-types`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createDiscountType = async (
  data: Omit<DiscountType, 'id' | 'created_at'>
): Promise<{ id: number }> => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/discount-types`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateDiscountType = async (
  id: number,
  data: Omit<DiscountType, 'id' | 'created_at'>
): Promise<void> => {
  try {
    await apiClient.put(`${API_BASE_URL}/discount-types/${id}`, data);
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteDiscountType = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`${API_BASE_URL}/discount-types/${id}`);
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// STUDENT DISCOUNTS
// ============================================================================

export const assignStudentDiscount = async (data: {
  studentId: number;
  discountTypeId: number;
  academicYear: string;
  term: string;
  notes?: string;
}): Promise<{ id: number }> => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/student-discounts`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const removeStudentDiscount = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`${API_BASE_URL}/student-discounts/${id}`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getStudentDiscounts = async (
  studentId: number,
  academicYear: string,
  term: string
): Promise<StudentDiscount[]> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/students/${studentId}/discounts`,
      { params: { academicYear, term } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getAllStudentDiscounts = async (filters?: {
  studentId?: number;
  academicYear?: string;
  term?: string;
  discountTypeId?: number;
}): Promise<StudentDiscount[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/student-discounts`, {
      params: filters,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// AUDIT LOGS
// ============================================================================

export const getAuditLogs = async (filters: {
  userId?: number;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/audit-logs`, {
      params: filters,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// ============================================================================
// ADVANCED REPORTS
// ============================================================================

export const getDebtorsList = async (
  academicYear: string,
  classId?: number,
  componentName?: string
): Promise<any[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/debtors`, {
      params: { academicYear, classId, componentName },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getClearedList = async (
  academicYear: string,
  classId?: number,
  componentName?: string
): Promise<any[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/cleared`, {
      params: { academicYear, classId, componentName },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getDailyCollections = async (
  date: string,
  classId?: number
): Promise<{ payments: any[]; total: number }> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/daily-collections`, {
      params: { date, classId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getMonthlyCollections = async (
  yearMonth: string,
  classId?: number
): Promise<any[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/reports/monthly-collections`, {
      params: { yearMonth, classId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getStudentsByClass = async (classId: number): Promise<Student[]> => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/students/by-class/${classId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getStudentPayments = async (studentId: number): Promise<Payment[]> => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/students/${studentId}/payments`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};