// src/features/class/hooks/useAcademicYears.ts
import { useState, useEffect } from 'react';
import type { AcademicYear } from '../../../utils/academicYear';
import { fetchAcademicYears, fetchCurrentAcademicYear } from '../api/classApi';

interface UseAcademicYearsResult {
  academicYears: AcademicYear[];
  currentAcademicYear: string;
  loading: boolean;
  error: string | null;
}

export const useAcademicYears = (yearsBack: number = 5): UseAcademicYearsResult => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAcademicYears = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        
        const [years, currentYear] = await Promise.all([
          fetchAcademicYears(yearsBack),
          fetchCurrentAcademicYear()
        ]);
        
        setAcademicYears(years);
        setCurrentAcademicYear(currentYear);
      } catch (err: any) {
        setError(err.message || 'Failed to load academic years');
        console.error('Error loading academic years:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAcademicYears();
  }, [yearsBack]);

  return { academicYears, currentAcademicYear, loading, error };
};