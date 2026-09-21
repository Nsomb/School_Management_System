// src/features/reportCard/hooks/useReportCard.ts
import { useState, useEffect, useCallback } from 'react';
import { ReportCardService, AdminService } from '../services/api';
import type {
  Student,
  ReportResponse,
  MarksOverview,
  ClassStatus,
  MarksStatus,
} from '../types/types';

export const useReportCard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // ─── Load initial data (classes + terms) ─────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [classData, termData] = await Promise.all([
          ReportCardService.getClasses(),
          ReportCardService.getTerms(),
        ]);
        setClasses(classData || []);
        setTerms(termData || []);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setClasses([]);
        setTerms(['1', '2', '3']);
        setError('Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // ─── Generic API wrapper ─────────────────────────────────
  const handleApiCall = useCallback(
    async <T,>(
      apiCall: () => Promise<T>,
      successMessage?: string
    ): Promise<T | undefined> => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const result = await apiCall();
        if (successMessage) setSuccess(successMessage);
        return result;
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Students ────────────────────────────────────────────
  const getStudents = useCallback(
    async (className: string) => {
      const result = await handleApiCall(() =>
        ReportCardService.getStudents(className)
      );
      if (result) setStudents(result);
      return result;
    },
    [handleApiCall]
  );

  // ─── Generate reports ────────────────────────────────────
  const generateStudentReport = useCallback(
    (
      studentId: string,
      className: string,
      term: string
    ): Promise<ReportResponse | undefined> =>
      handleApiCall(
        () => ReportCardService.generateStudentReport(studentId, className, term),
        'Student report generated successfully'
      ),
    [handleApiCall]
  );

  const generateFinalYearReport = useCallback(
    (
      studentId: string,
      className: string
    ): Promise<ReportResponse | undefined> =>
      handleApiCall(
        () => ReportCardService.generateFinalYearReport(studentId, className),
        'Final Year report generated successfully'
      ),
    [handleApiCall]
  );

  const generateHonourRoll = useCallback(
    (
      studentId: string,
      className: string,
      term: string
    ): Promise<ReportResponse | undefined> =>
      handleApiCall(
        () => ReportCardService.generateHonourRoll(studentId, className, term),
        'Honour Roll certificate generated successfully!'
      ),
    [handleApiCall]
  );

  const generateBatchHonourRoll = useCallback(
    (
      className: string,
      term: string
    ): Promise<ReportResponse | undefined> =>
      handleApiCall(
        () => ReportCardService.generateBatchHonourRoll(className, term),
        'Batch Honour Roll certificates generated successfully!'
      ),
    [handleApiCall]
  );

  const generateClassReport = useCallback(
    (
      className: string,
      term: string
    ): Promise<ReportResponse | undefined> =>
      handleApiCall(
        () => ReportCardService.generateClassReport(className, term),
        'Class reports generated successfully'
      ),
    [handleApiCall]
  );

  // ─── Download (accepts full path OR filename) ────────────
  const downloadReport = useCallback(
    (downloadPath: string): Promise<Blob | undefined> =>
      handleApiCall(() => ReportCardService.downloadReport(downloadPath)),
    [handleApiCall]
  );

  // ─── Admin integration ───────────────────────────────────
  const getMarksOverview = useCallback(
    (class_name: string, term: string) =>
      handleApiCall(() => AdminService.getMarksOverview(class_name, term)),
    [handleApiCall]
  );

  const getMarksStatus = useCallback(
    (class_name: string, term: string) =>
      handleApiCall(() => AdminService.getMarksStatus(class_name, term)),
    [handleApiCall]
  );

  const getClassesStatus = useCallback(
    (term: string) =>
      handleApiCall(() => AdminService.getClassesStatus(term)),
    [handleApiCall]
  );

  // ─── Utility ─────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  return {
    isLoading,
    error,
    success,
    classes,
    terms,
    students,
    getStudents,
    generateStudentReport,
    generateFinalYearReport,
    generateHonourRoll,
    generateBatchHonourRoll,
    generateClassReport,
    downloadReport,
    getMarksOverview,
    getMarksStatus,
    getClassesStatus,
    clearError,
    clearSuccess,
    setError,
    setSuccess,
  };
};