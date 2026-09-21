// src/features/class/hooks/useClassNames.ts
import { useState, useEffect } from 'react';
import { fetchDistinctClassNames } from '../api/classApi';

interface UseClassNamesResult {
  classNames: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useClassNames = (): UseClassNamesResult => {
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadClassNames = async (): Promise<void> => {
    try {
      console.log('Starting to load class names...');
      setLoading(true);
      setError(null);
      
      const names = await fetchDistinctClassNames();
      console.log('Class names loaded successfully:', names);
      
      setClassNames(names);
    } catch (err: any) {
      console.error('Error in loadClassNames:', err);
      
      const errorMessage = err.message || 'Failed to load class names';
      setError(errorMessage);
      
      // Set empty array instead of throwing to prevent UI crash
      setClassNames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassNames();
  }, []);

  return { classNames, loading, error, refetch: loadClassNames };
};