// src/features/marks/api/marksApi.ts
import apiClient from '../../../api/AuthService';
import type {
  Mark,
  MarkFormData,
  Student,
  Subject,
  Class,
  ExistingMarksResponse,
  TermMarksResponse,
} from '../types/markTypes';

const API = '/api/marks';

export const marksApi = {
  // ─── TEACHER SUBJECTS ────────────────────────────────────
  getTeacherSubjects: async (): Promise<Subject[]> => {
    try {
      const response = await apiClient.get(`${API}/teacher/subjects`);
      return response.data.subjects || [];
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      throw new Error('Failed to fetch assigned subjects');
    }
  },

  // ─── STUDENTS IN A CLASS ─────────────────────────────────
  getStudentsByClass: async (classId: number): Promise<Student[]> => {
    try {
      const response = await apiClient.get(`/api/classes/${classId}/students`);
      const students = response.data.students || response.data || [];
      return students.map((s: any) => ({
        id: s.id,
        full_name: s.name || s.full_name,
        class_id: s.class_id,
        registration_number: s.registration_number,
      }));
    } catch (error) {
      throw new Error('Failed to fetch students');
    }
  },

  // ─── COMPETENCY ──────────────────────────────────────────
  getCompetency: async (
    subjectId: number,
    classId: number,
    evaluationType: string
  ): Promise<string | null> => {
    try {
      const response = await apiClient.get(`${API}/competency`, {
        params: { subjectId, classId, evaluationType },
      });
      return response.data.competency;
    } catch (error) {
      return null;
    }
  },

  // ─── EXISTING MARKS (single evaluation) ──────────────────
  getExistingMarks: async (
    subjectId: number,
    classId: number,
    evaluationType: string
  ): Promise<ExistingMarksResponse> => {
    try {
      const response = await apiClient.get(`${API}/existing`, {
        params: { subjectId, classId, evaluationType },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch existing marks');
    }
  },

  // ─── SUBMIT SINGLE EVALUATION ────────────────────────────
  submitMarksBatch: async (formData: MarkFormData): Promise<any> => {
    try {
      const response = await apiClient.post(`${API}/batch`, formData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to submit marks');
    }
  },

  // ─── TERM MARKS (read + write) ───────────────────────────
  getTermMarks: async (
    subjectId: number,
    classId: number,
    termType: string
  ): Promise<TermMarksResponse> => {
    try {
      const response = await apiClient.get(`${API}/term`, {
        params: { subject_id: subjectId, class_id: classId, term_type: termType },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch term marks');
    }
  },

  submitTermMarks: async (data: any): Promise<any> => {
    try {
      const response = await apiClient.post(`${API}/term`, data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to submit marks');
    }
  },
};

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
};