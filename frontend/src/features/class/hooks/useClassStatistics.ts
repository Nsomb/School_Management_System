// src/features/class/hooks/useClassStatistics.ts
import { useState, useEffect } from 'react';
import type { ClassStatistics, Metadata } from '../types/classTypes';
import { fetchClassStatistics } from '../api/classApi';

interface UseClassStatisticsResult {
  statistics: ClassStatistics[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  metadata?: Metadata;
}

export const useClassStatistics = (
  className: string,
  term?: string,
  academicYear?: string
): UseClassStatisticsResult => {
  const [statistics, setStatistics] = useState<ClassStatistics[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const fetchData = async (): Promise<void> => {
    if (!className) {
      setStatistics([]);
      setError(null);
      setMetadata(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetchClassStatistics(className, term, academicYear);
      
      // Handle both response formats
      if (typeof response === 'object' && !Array.isArray(response)) {
        // Check if it's a "no data" response using type assertion
        const responseWithMessage = response as { message?: string; statistics?: ClassStatistics[]; data?: ClassStatistics[]; metadata?: Metadata };
        
        // Check if it's a "no data" response (not an error)
        if (responseWithMessage.message && (responseWithMessage.message.includes('No subjects found') || responseWithMessage.message.includes('No students found'))) {
          // This is not an error, just no data available
          setStatistics(responseWithMessage.statistics || responseWithMessage.data || []);
          setMetadata(responseWithMessage.metadata || null);
          setError(null); // Clear any previous error
        } 
        else if ('statistics' in response && Array.isArray(response.statistics)) {
          setStatistics(response.statistics);
          setMetadata(response.metadata || null);
        } 
        else if ('data' in response && Array.isArray(response.data)) {
          setStatistics(response.data);
          setMetadata(response.metadata || null);
        } 
        else {
          setStatistics([]);
          setMetadata(null);
        }
      } 
      else if (Array.isArray(response)) {
        // If it's just an array of statistics
        setStatistics(response);
        setMetadata(null);
      } 
      else {
        setStatistics([]);
        setMetadata(null);
      }
      
    } catch (err: any) {
      // Check if it's a specific "no data" error vs a real error
      const errorMessage = err.message || 'Failed to load class statistics';
      
      if (errorMessage.includes('No subjects found') || errorMessage.includes('No students found')) {
        // This is not really an error, just no data available
        setStatistics([]);
        setError(null);
      } else {
        setError(errorMessage);
      }
      
      setStatistics([]);
      setMetadata(null);
      console.error('Error loading class statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [className, term, academicYear]);

  return {
    statistics,
    loading,
    error,
    refetch: fetchData,
    metadata: metadata || undefined,
  };
};