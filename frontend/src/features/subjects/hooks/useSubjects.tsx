// src/features/subjects/hooks/useSubjects.ts
import { useState, useEffect, useCallback } from 'react';
import type {
  Subject, Faculty, Specialty, SubjectCreateData, UseSubjectsReturn,
} from '../types/subjectTypes';
import { subjectService } from '../api/subjectService';
import { facultyService } from '../api/facultyService';
import { specialtyService } from '../api/specialtyService';

export const useSubjects = (): UseSubjectsReturn => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [subjectsRes, facultiesRes] = await Promise.all([
        subjectService.getAllSubjects(),
        facultyService.getAll(),
      ]);

      setSubjects(subjectsRes || []);
      setFaculties(Array.isArray(facultiesRes) ? facultiesRes : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setError(msg);
      setSubjects([]);
      setFaculties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSpecialties = useCallback(async (facultyId: string): Promise<void> => {
    if (!facultyId) {
      setSpecialties([]);
      return;
    }
    try {
      const res = await specialtyService.getByFaculty(Number(facultyId));
      setSpecialties(Array.isArray(res) ? res : []);
    } catch {
      setSpecialties([]);
    }
  }, []);

  const createSubject = async (data: SubjectCreateData): Promise<Subject> => {
    try {
      const created = await subjectService.createSubject(data);
      await fetchData();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create subject';
      setError(msg);
      throw err;
    }
  };

  const updateSubject = async (id: string, data: SubjectCreateData): Promise<Subject> => {
    try {
      const updated = await subjectService.updateSubject(id, data);
      await fetchData();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update subject';
      setError(msg);
      throw err;
    }
  };

  const removeSubject = async (id: string): Promise<void> => {
    try {
      await subjectService.deleteSubject(id);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete subject';
      setError(msg);
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    subjects,
    faculties,
    specialties,
    loading,
    error,
    fetchSpecialties,
    createSubject,
    updateSubject,
    removeSubject,
    refetch: fetchData,
  };
};