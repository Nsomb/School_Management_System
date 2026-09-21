// src/features/teachers/hooks/useTeachers.ts
import { useState, useEffect, useCallback } from 'react';
import { getTeachers, deleteTeacher as deleteTeacherApi } from '../api/teacherApi';
import type { Teacher } from '../types/teacherTypes';

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeachers();
      
      // Ensure each teacher has an assignments array
      const teachersWithAssignments = data.map(teacher => ({
        ...teacher,
        assignments: teacher.assignments || []
      }));
      
      setTeachers(teachersWithAssignments);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to load teachers: ${err.message}`);
      } else {
        setError('Failed to load teachers. Please try again.');
      }
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTeacher = async (username: string) => {
    try {
      await deleteTeacherApi(username);
      fetchTeachers();
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to delete teacher: ${err.message}`);
      } else {
        setError('Failed to delete teacher. Please try again.');
      }
      throw err;
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return { teachers, loading, error, refetch: fetchTeachers, deleteTeacher };
};