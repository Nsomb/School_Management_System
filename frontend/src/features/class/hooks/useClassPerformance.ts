// src/features/class/hooks/useClassPerformance.ts
import { useState, useEffect } from 'react';
import { fetchClassReport, type ClassReportResponse } from '../api/classApi';

interface UseClassPerformanceResult {
  reportData: ClassReportResponse | null;
  loading: boolean;
  error: string | null;
}

export const useClassPerformance = (
  className: string, 
  evaluationType: string,
  term?: string,
  academicYear?: string
): UseClassPerformanceResult => {
  const [reportData, setReportData] = useState<ClassReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!className || !evaluationType) {
      setReportData(null);
      setError(null);
      return;
    }

    const getPerformance = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchClassReport(className, evaluationType, term, academicYear);
        setReportData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch class performance data');
      } finally {
        setLoading(false);
      }
    };

    getPerformance();
  }, [className, evaluationType, term, academicYear]);

  return { reportData, loading, error };
};