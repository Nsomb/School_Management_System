// src/features/class/hooks/useClassStudents.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchClassStudents } from '../api/classApi';
import type { Student } from '../types/classTypes';

interface UseClassStudentsResult {
  students: Student[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  rawData?: any; // For debugging
}

export const useClassStudents = (className: string): UseClassStudentsResult => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any>(null); // For debugging

  const fetchStudents = useCallback(async () => {
    if (!className) {
      setStudents([]);
      setError(null);
      setRawData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setRawData(null);
    
    try {
      console.log(`[useClassStudents] Fetching students for: ${className}`);
      const data = await fetchClassStudents(className);
      console.log(`[useClassStudents] Received data:`, data);
      
      setStudents(data);
      setRawData(data); // Store raw data for debugging
      
      if (data.length === 0) {
        console.warn(`[useClassStudents] No students found for class: ${className}`);
      }
    } catch (err: any) {
      console.error(`[useClassStudents] Error for class ${className}:`, err);
      setError(err.message || 'Failed to fetch class students');
    } finally {
      setLoading(false);
    }
  }, [className]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refetch: fetchStudents, rawData };
};