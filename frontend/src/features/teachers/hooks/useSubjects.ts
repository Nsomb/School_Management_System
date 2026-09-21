import { useState, useEffect } from 'react';
import { getSubjectsByClassId } from '../api/subjectApi';
import type { Subject } from '../types/teacherTypes';

export const useSubjects = (classId: number | null) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchSubjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getSubjectsByClassId(classId);
        setSubjects(data);
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to fetch subjects';
        setError(errorMessage);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [classId]);

  return { subjects, loading, error };
};