import { useState, useEffect, useCallback } from 'react';
import type { Subject, Faculty, Specialty, SubjectCreateData, UseSubjectsReturn } from '../types/subjectTypes';
import { subjectService } from '../api/subjectService';
import { facultyService } from '../api/facultyService';
import { specialtyService } from '../api/specialtyService';

export const useSubjects = (): UseSubjectsReturn => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to memoize the fetchData function
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [subjectsRes, facultiesRes] = await Promise.all([
        subjectService.getAllSubjects(),
        facultyService.getAll()
      ]);

      // Ensure the responses are arrays and map them to the correct types.
      const transformedSubjects: Subject[] = (subjectsRes || []).map((subject: any) => ({
        ...subject,
        faculty: subject.faculty || undefined,
        specialty: subject.specialty || undefined,
      }));

      setSubjects(transformedSubjects);
      const facultiesArray: Faculty[] = Array.isArray(facultiesRes) ? facultiesRes : [];
      setFaculties(facultiesArray);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setSubjects([]);
      setFaculties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useCallback to memoize the fetchSpecialties function
  const fetchSpecialties = useCallback(async (facultyId: string): Promise<void> => {
    if (!facultyId) {
      setSpecialties([]);
      return;
    }

    try {
      const specialtiesRes = await specialtyService.getByFaculty(facultyId);
      const specialtiesArray: Specialty[] = Array.isArray(specialtiesRes) ? specialtiesRes : [];
      setSpecialties(specialtiesArray);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch specialties';
      console.error('Error fetching specialties:', errorMessage);
      setSpecialties([]);
    }
  }, []);

  const createSubject = async (subjectData: SubjectCreateData): Promise<Subject> => {
    try {
      // FIX: Convert faculty_id from string to number before sending to the service.
      const newSubject = await subjectService.createSubject({
        name: subjectData.name,
        coefficient: subjectData.coefficient,
        faculty_id: Number(subjectData.faculty_id),
        specialty_id: subjectData.specialty_id,
        classes: subjectData.classes || []
      });
      await fetchData(); // Refresh the data
      return newSubject;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subject';
      setError(errorMessage);
      throw err;
    }
  };

  const removeSubject = async (subjectId: string): Promise<void> => {
    try {
      await subjectService.deleteSubject(subjectId);
      await fetchData(); // Refresh the data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete subject';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Add fetchData to dependency array

  return {
    subjects,
    faculties,
    specialties,
    loading,
    error,
    fetchSpecialties,
    createSubject,
    removeSubject,
    refetch: fetchData
  };
};
