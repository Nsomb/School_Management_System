// features/marks/hooks/useMarks.ts
import { useState, useCallback } from 'react';
import { marksApi, handleApiError } from '../api/marksApi';
import type { Mark, MarkFormData, Student, Subject, ExistingMarksResponse, TermMarksResponse } from '../types/markTypes';

export const useMarks = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTeacherSubjects = useCallback(async (): Promise<Subject[]> => {
    try {
      setLoading(true);
      setError(null);
      return await marksApi.getTeacherSubjects();
    } catch (err) {
      setError(handleApiError(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentsByClass = useCallback(async (classId: number): Promise<Student[]> => {
    try {
      setLoading(true);
      setError(null);
      return await marksApi.getStudentsByClass(classId);
    } catch (err) {
      setError(handleApiError(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompetency = useCallback(async (subjectId: number, classId: number, evaluationType: string): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      return await marksApi.getCompetency(subjectId, classId, evaluationType);
    } catch (err) {
      setError(handleApiError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getExistingMarks = useCallback(async (subjectId: number, classId: number, evaluationType: string): Promise<ExistingMarksResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      return await marksApi.getExistingMarks(subjectId, classId, evaluationType);
    } catch (err) {
      setError(handleApiError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitMarksBatch = useCallback(async (formData: MarkFormData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const result = await marksApi.submitMarksBatch(formData);
      return result.success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit marks';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTermMarks = useCallback(async (subjectId: number, classId: number, termType: string): Promise<TermMarksResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      return await marksApi.getTermMarks(subjectId, classId, termType);
    } catch (err) {
      setError(handleApiError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitTermMarks = useCallback(async (data: any): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const result = await marksApi.submitTermMarks(data);
      return result.success;
    } catch (err) {
      setError(handleApiError(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getTeacherSubjects,
    getStudentsByClass,
    getCompetency,
    getExistingMarks,
    submitMarksBatch,
    getTermMarks,
    submitTermMarks,
  };
};