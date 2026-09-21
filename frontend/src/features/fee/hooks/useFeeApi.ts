import { useState, useCallback } from 'react';
import axios from 'axios';
import * as feeService from '../api/feeService';
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
  StudentDiscount
} from '../types/feeTypes';

// ============================================================================
// TYPES
// ============================================================================

type CreateFeeStructureResponse = { feeStructureId: number };

type RecordPaymentResponse = {
  paymentId: number;
  receiptNumber: string;
  receiptFilename: string;
  receiptDownloadUrl: string;
};

type UpdateFeeStructureParams = {
  description?: string;
  due_date?: string;
  components: FeeComponent[];
  class_names?: string[];
};

type RecordPaymentParams = {
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
};

interface DashboardStats {
  totalExpected: number;
  totalCollected: number;
  outstanding: number;
  collectionPercentage: number;
  studentsCleared: number;
  studentsOwing: number;
  todayCollected: number;
  monthCollected: number;
}

interface FeeApiHook {
  loading: boolean;
  error: string | null;
  clearError: () => void;

  // Fee Structure
  createFeeStructure: (data: {
    class_names: string[];
    academic_year: string;
    term: string;
    description?: string;
    due_date?: string;
    components: FeeComponent[];
  }) => Promise<CreateFeeStructureResponse>;
  getFeeStructures: (classId?: number, academicYear?: string) => Promise<FeeStructure[]>;
  getAllFeeStructures: () => Promise<FeeStructure[]>;
  getFeeStructureById: (id: number) => Promise<FeeStructure>;
  updateFeeStructure: (id: number, data: UpdateFeeStructureParams) => Promise<void>;
  deleteFeeStructure: (id: number) => Promise<void>;

  // Student
  searchStudents: (name: string) => Promise<Student[]>;
  getStudentDetails: (studentId: number) => Promise<Student>;
  getStudentsByClass: (classId: number) => Promise<Student[]>;
  getStudentPayments: (studentId: number) => Promise<Payment[]>;

  // Payment
  recordPayment: (data: RecordPaymentParams) => Promise<RecordPaymentResponse>;
  getPayments: (studentId?: number, academicYear?: string) => Promise<Payment[]>;
  getPaymentDetails: (paymentId: number) => Promise<Payment>;
  downloadReceipt: (paymentId: number) => Promise<Blob>;
  voidPayment: (paymentId: number, reason: string) => Promise<{ message: string; paymentId: number }>;
  reversePayment: (paymentId: number, reason: string) => Promise<{
    message: string;
    originalId: number;
    reversalId: number;
    receiptPath: string;
  }>;

  // Class
  getAllClasses: () => Promise<ClassSummary[]>;
  getClassDetails: (classId: number) => Promise<ClassSummary>;

  // Academic Year
  getAllAcademicYears: () => Promise<AcademicYear[]>;
  getCurrentAcademicYear: () => Promise<string>;

  // Reports
  getCollectionSummary: (academicYear: string, classId?: number) => Promise<CollectionSummary[]>;
  getOutstandingBalances: (academicYear: string, classId?: number) => Promise<OutstandingBalance[]>;
  getPaymentsByDateRange: (startDate: string, endDate: string, classId?: number) => Promise<Payment[]>;
  getStudentFeeSummary: (studentId: number, academicYear: string) => Promise<StudentFeeSummary>;
  getClassFeeSummary: (classId: number, academicYear: string, feeStructureId: number, componentName?: string) => Promise<ClassFeeSummary>;
  getDashboardStats: (academicYear: string, classId?: number) => Promise<DashboardStats>;
  downloadStudentStatement: (studentId: number, academicYear: string) => Promise<Blob>;

  // Excel Exports
  exportCollectionSummary: (academicYear: string, classId?: number) => Promise<Blob>;
  exportOutstandingBalances: (academicYear: string, classId?: number) => Promise<Blob>;
  exportPaymentsByDate: (startDate: string, endDate: string) => Promise<Blob>;
  exportFeeStructuresExcel: (classId?: number) => Promise<Blob>;

  // Audit Logs
  getAuditLogs: (filters: {
    userId?: number;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ logs: AuditLog[]; total: number }>;

  // Discounts
  getDiscountTypes: () => Promise<DiscountType[]>;
  createDiscountType: (data: Omit<DiscountType, 'id' | 'created_at'>) => Promise<{ id: number }>;
  updateDiscountType: (id: number, data: Omit<DiscountType, 'id' | 'created_at'>) => Promise<void>;
  deleteDiscountType: (id: number) => Promise<void>;
  assignStudentDiscount: (data: {
    studentId: number;
    discountTypeId: number;
    academicYear: string;
    term: string;
    notes?: string;
  }) => Promise<{ id: number }>;
  removeStudentDiscount: (id: number) => Promise<void>;
  getStudentDiscounts: (studentId: number, academicYear: string, term: string) => Promise<StudentDiscount[]>;
  getAllStudentDiscounts: (filters?: {
    studentId?: number;
    academicYear?: string;
    term?: string;
    discountTypeId?: number;
  }) => Promise<StudentDiscount[]>;

  // Advanced Reports
  getDebtorsList: (academicYear: string, classId?: number, componentName?: string) => Promise<any[]>;
  getClearedList: (academicYear: string, classId?: number, componentName?: string) => Promise<any[]>;
  getDailyCollections: (date: string, classId?: number) => Promise<{ payments: any[]; total: number }>;
  getMonthlyCollections: (yearMonth: string, classId?: number) => Promise<any[]>;
}

// ============================================================================
// HELPERS
// ============================================================================

const asArray = <T,>(input: unknown): T[] => {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    for (const key of [
      'data', 'items', 'rows', 'list', 'results', 'records',
      'structures', 'feeStructures', 'fee_structures',
      'payments', 'students', 'classes', 'logs',
      'discountTypes', 'discount_types', 'years', 'academicYears',
      'academic_years', 'summaries', 'balances', 'collections',
    ]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
};

// ============================================================================
// HOOK
// ============================================================================

export const useFeeApi = (): FeeApiHook => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeRequest = useCallback(async <T,>(request: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await request();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // === Fee Structure ===
  const createFeeStructure = useCallback(
    (data: any) => executeRequest(() => feeService.createFeeStructure(data)),
    [executeRequest]
  );

  const getFeeStructures = useCallback(
    (classId?: number, academicYear?: string) =>
      executeRequest(async () => {
        const data = await feeService.getAllFeeStructures(classId, academicYear);
        return asArray<FeeStructure>(data);
      }),
    [executeRequest]
  );

  const getAllFeeStructures = useCallback(
    () =>
      executeRequest(async () => {
        const data = await feeService.getAllFeeStructures();
        return asArray<FeeStructure>(data);
      }),
    [executeRequest]
  );

  const getFeeStructureById = useCallback(
    (id: number) => executeRequest(() => feeService.getFeeStructureById(id)),
    [executeRequest]
  );

  const updateFeeStructure = useCallback(
    (id: number, data: UpdateFeeStructureParams) =>
      executeRequest(() => feeService.updateFeeStructure(id, data)),
    [executeRequest]
  );

  const deleteFeeStructure = useCallback(
    (id: number) => executeRequest(() => feeService.deleteFeeStructure(id)),
    [executeRequest]
  );

  // === Student ===
  const searchStudents = useCallback(
    (name: string) =>
      executeRequest(async () => asArray<Student>(await feeService.searchStudents(name))),
    [executeRequest]
  );

  const getStudentDetails = useCallback(
    (studentId: number) => executeRequest(() => feeService.getStudentDetails(studentId)),
    [executeRequest]
  );

  const getStudentsByClass = useCallback(
    (classId: number) =>
      executeRequest(async () => asArray<Student>(await feeService.getStudentsByClass(classId))),
    [executeRequest]
  );

  const getStudentPayments = useCallback(
    (studentId: number) =>
      executeRequest(async () => asArray<Payment>(await feeService.getStudentPayments(studentId))),
    [executeRequest]
  );

  // === Payment ===
  const recordPayment = useCallback(
    (data: RecordPaymentParams) => executeRequest(() => feeService.recordPayment(data)),
    [executeRequest]
  );

  const getPayments = useCallback(
    (studentId?: number, academicYear?: string) =>
      executeRequest(async () =>
        asArray<Payment>(await feeService.getPayments(studentId, academicYear))
      ),
    [executeRequest]
  );

  const getPaymentDetails = useCallback(
    (paymentId: number) => executeRequest(() => feeService.getPaymentDetails(paymentId)),
    [executeRequest]
  );

  const downloadReceipt = useCallback(
    (paymentId: number) => executeRequest(() => feeService.downloadReceipt(paymentId)),
    [executeRequest]
  );

  const voidPayment = useCallback(
    (paymentId: number, reason: string) =>
      executeRequest(() => feeService.voidPayment(paymentId, reason)),
    [executeRequest]
  );

  const reversePayment = useCallback(
    (paymentId: number, reason: string) =>
      executeRequest(() => feeService.reversePayment(paymentId, reason)),
    [executeRequest]
  );

  // === Class ===
  const getAllClasses = useCallback(
    () =>
      executeRequest(async () => asArray<ClassSummary>(await feeService.getAllClasses())),
    [executeRequest]
  );

  const getClassDetails = useCallback(
    (classId: number) => executeRequest(() => feeService.getClassDetails(classId)),
    [executeRequest]
  );

  // === Academic Year ===
  const getAllAcademicYears = useCallback(
    () =>
      executeRequest(async () => asArray<AcademicYear>(await feeService.getAllAcademicYears())),
    [executeRequest]
  );

  const getCurrentAcademicYear = useCallback(
    () => executeRequest(() => feeService.getCurrentAcademicYear()),
    [executeRequest]
  );

  // === Reports ===
  const getCollectionSummary = useCallback(
    (academicYear: string, classId?: number) =>
      executeRequest(async () =>
        asArray<CollectionSummary>(await feeService.getCollectionSummary(academicYear, classId))
      ),
    [executeRequest]
  );

  const getOutstandingBalances = useCallback(
    (academicYear: string, classId?: number) =>
      executeRequest(async () =>
        asArray<OutstandingBalance>(await feeService.getOutstandingBalances(academicYear, classId))
      ),
    [executeRequest]
  );

  const getPaymentsByDateRange = useCallback(
    (startDate: string, endDate: string, classId?: number) =>
      executeRequest(async () =>
        asArray<Payment>(await feeService.getPaymentsByDateRange(startDate, endDate, classId))
      ),
    [executeRequest]
  );

  const getStudentFeeSummary = useCallback(
    (studentId: number, academicYear: string) =>
      executeRequest(() => feeService.getStudentFeeSummary(studentId, academicYear)),
    [executeRequest]
  );

  const getClassFeeSummary = useCallback(
    (classId: number, academicYear: string, feeStructureId: number, componentName?: string) =>
      executeRequest(() =>
        feeService.getClassFeeSummary(classId, academicYear, feeStructureId, componentName)
      ),
    [executeRequest]
  );

  const getDashboardStats = useCallback(
    (academicYear: string, classId?: number) =>
      executeRequest(() => feeService.getDashboardStats(academicYear, classId)),
    [executeRequest]
  );

  const downloadStudentStatement = useCallback(
    (studentId: number, academicYear: string) =>
      executeRequest(() => feeService.downloadStudentStatement(studentId, academicYear)),
    [executeRequest]
  );

  // === Excel Exports ===
  const exportCollectionSummary = useCallback(
    (academicYear: string, classId?: number) =>
      executeRequest(() => feeService.exportCollectionSummary(academicYear, classId)),
    [executeRequest]
  );

  const exportOutstandingBalances = useCallback(
    (academicYear: string, classId?: number) =>
      executeRequest(() => feeService.exportOutstandingBalances(academicYear, classId)),
    [executeRequest]
  );

  const exportPaymentsByDate = useCallback(
    (startDate: string, endDate: string) =>
      executeRequest(() => feeService.exportPaymentsByDate(startDate, endDate)),
    [executeRequest]
  );

  const exportFeeStructuresExcel = useCallback(
    (classId?: number) =>
      executeRequest(() => feeService.exportFeeStructuresExcel(classId)),
    [executeRequest]
  );

  // === Audit Logs ===
  const getAuditLogs = useCallback(
    (filters: any) => executeRequest(() => feeService.getAuditLogs(filters)),
    [executeRequest]
  );

  // === Discounts ===
  const getDiscountTypes = useCallback(
    () =>
      executeRequest(async () => asArray<DiscountType>(await feeService.getDiscountTypes())),
    [executeRequest]
  );

  const createDiscountType = useCallback(
    (data: any) => executeRequest(() => feeService.createDiscountType(data)),
    [executeRequest]
  );

  const updateDiscountType = useCallback(
    (id: number, data: any) =>
      executeRequest(() => feeService.updateDiscountType(id, data)),
    [executeRequest]
  );

  const deleteDiscountType = useCallback(
    (id: number) => executeRequest(() => feeService.deleteDiscountType(id)),
    [executeRequest]
  );

  const assignStudentDiscount = useCallback(
    (data: any) => executeRequest(() => feeService.assignStudentDiscount(data)),
    [executeRequest]
  );

  const removeStudentDiscount = useCallback(
    (id: number) => executeRequest(() => feeService.removeStudentDiscount(id)),
    [executeRequest]
  );

  const getStudentDiscounts = useCallback(
    (studentId: number, academicYear: string, term: string) =>
      executeRequest(async () =>
        asArray<StudentDiscount>(await feeService.getStudentDiscounts(studentId, academicYear, term))
      ),
    [executeRequest]
  );

  const getAllStudentDiscounts = useCallback(
    (filters?: any) =>
      executeRequest(async () =>
        asArray<StudentDiscount>(await feeService.getAllStudentDiscounts(filters))
      ),
    [executeRequest]
  );

  // === Advanced Reports ===
  const getDebtorsList = useCallback(
    (academicYear: string, classId?: number, componentName?: string) =>
      executeRequest(async () =>
        asArray<any>(await feeService.getDebtorsList(academicYear, classId, componentName))
      ),
    [executeRequest]
  );

  const getClearedList = useCallback(
    (academicYear: string, classId?: number, componentName?: string) =>
      executeRequest(async () =>
        asArray<any>(await feeService.getClearedList(academicYear, classId, componentName))
      ),
    [executeRequest]
  );

  const getDailyCollections = useCallback(
    (date: string, classId?: number) =>
      executeRequest(async () => {
        const data = await feeService.getDailyCollections(date, classId);
        return {
          payments: asArray<any>((data as any)?.payments ?? data),
          total: Number((data as any)?.total ?? 0),
        };
      }),
    [executeRequest]
  );

  const getMonthlyCollections = useCallback(
    (yearMonth: string, classId?: number) =>
      executeRequest(async () =>
        asArray<any>(await feeService.getMonthlyCollections(yearMonth, classId))
      ),
    [executeRequest]
  );

  return {
    loading,
    error,
    clearError: () => setError(null),

    createFeeStructure,
    getFeeStructures,
    getAllFeeStructures,
    getFeeStructureById,
    updateFeeStructure,
    deleteFeeStructure,

    searchStudents,
    getStudentDetails,
    getStudentsByClass,
    getStudentPayments,

    recordPayment,
    getPayments,
    getPaymentDetails,
    downloadReceipt,
    voidPayment,
    reversePayment,

    getAllClasses,
    getClassDetails,

    getAllAcademicYears,
    getCurrentAcademicYear,

    getCollectionSummary,
    getOutstandingBalances,
    getPaymentsByDateRange,
    getStudentFeeSummary,
    getClassFeeSummary,
    getDashboardStats,
    downloadStudentStatement,

    exportCollectionSummary,
    exportOutstandingBalances,
    exportPaymentsByDate,
    exportFeeStructuresExcel,

    getAuditLogs,

    getDiscountTypes,
    createDiscountType,
    updateDiscountType,
    deleteDiscountType,
    assignStudentDiscount,
    removeStudentDiscount,
    getStudentDiscounts,
    getAllStudentDiscounts,

    getDebtorsList,
    getClearedList,
    getDailyCollections,
    getMonthlyCollections,
  };
};