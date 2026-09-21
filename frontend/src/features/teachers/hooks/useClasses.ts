import { useState, useEffect } from 'react';
import { getClasses, getClassesWithSubjectCounts } from '../api/classApi';
import type { Class } from '../types/teacherTypes';

export const useClasses = (withSubjectCounts = false) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: Class[];
        
        if (withSubjectCounts) {
          data = await getClassesWithSubjectCounts();
        } else {
          data = await getClasses();
        }
        
        setClasses(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch classes';
        setError(errorMessage);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [withSubjectCounts]);

  return { classes, loading, error };
};