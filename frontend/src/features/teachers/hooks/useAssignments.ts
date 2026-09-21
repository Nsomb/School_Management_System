import { useState, useEffect } from 'react';
import type { TeacherAssignment, AssignmentFormData } from '../types/teacherTypes';
import { 
  getTeacherAssignments, 
  createAssignment, 
  deleteAssignment 
} from '../api/assignmentApi';

export const useAssignments = (teacherId?: number) => {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    if (!teacherId) return;
    
    try {
      setLoading(true);
      const data = await getTeacherAssignments(teacherId);
      setAssignments(data);
    } catch (err) {
      // Proper error typing
      if (err instanceof Error) {
        setError(`Failed to fetch assignments: ${err.message}`);
      } else {
        setError('Failed to fetch assignments');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async (assignmentData: AssignmentFormData) => {
    try {
      setLoading(true);
      const newAssignment = await createAssignment({
        ...assignmentData,
        teacher_id: teacherId!
      });
      setAssignments([...assignments, newAssignment]);
    } catch (err) {
      // Proper error typing
      if (err instanceof Error) {
        setError(`Failed to create assignment: ${err.message}`);
      } else {
        setError('Failed to create assignment');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeAssignment = async (assignmentId: number) => {
    try {
      setLoading(true);
      await deleteAssignment(assignmentId);
      setAssignments(assignments.filter(a => a.id !== assignmentId));
    } catch (err) {
      // Proper error typing
      if (err instanceof Error) {
        setError(`Failed to delete assignment: ${err.message}`);
      } else {
        setError('Failed to delete assignment');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) {
      fetchAssignments();
    }
  }, [teacherId]);

  return { 
    assignments, 
    loading, 
    error, 
    addAssignment,
    removeAssignment,
    refresh: fetchAssignments
  };
};