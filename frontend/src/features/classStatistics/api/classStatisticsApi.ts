// src/features/classStatistics/api/classStatisticsApi.ts
import apiClient from '../../../api/AuthService';

export interface SubjectStat {
  subject_id: number;
  subject_name: string;
  class_average_mark: string;
  performance_percentage: string;
  is_below_10_percent: boolean;
  students_evaluated_count: number;
  total_students_in_class: number;
}

export interface StatisticsMetadata {
  class_name: string;
  term: string;
  academic_year: string;
  total_students: number;
  total_subjects: number;
  total_marks_found: number;
  relevant_marks: number;
  has_data: boolean;
}

export interface StatisticsResponse {
  message?: string;
  statistics: SubjectStat[];
  metadata: StatisticsMetadata;
  teacher_id?: number;
}

const API = '/api/class-statistics';

export const classStatisticsApi = {
  // ─── TEACHER ENDPOINTS ───────────────────────────────────
  getTeacherSubjects: async (): Promise<any[]> => {
    const response = await apiClient.get(`${API}/teacher/subjects`);
    return response.data.subjects || [];
  },

  getTeacherStatistics: async (
    class_name: string,
    term?: string,
    academic_year?: string
  ): Promise<StatisticsResponse> => {
    const response = await apiClient.get(`${API}/teacher`, {
      params: {
        class_name,
        term: term || 'Year-End',
        academic_year: academic_year || '2025/2026',
      },
    });
    return response.data;
  },

  downloadTeacherStatisticsPDF: async (
    class_name: string,
    term: string,
    academic_year: string
  ): Promise<Blob> => {
    const response = await apiClient.post(
      `${API}/teacher/download`,
      { class_name, term, academic_year },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // ─── ADMIN ENDPOINTS ─────────────────────────────────────
  getAdminStatistics: async (
    class_name: string,
    term: string,
    academic_year: string
  ): Promise<StatisticsResponse> => {
    const response = await apiClient.get(`${API}/admin`, {
      params: { class_name, term, academic_year },
    });
    return response.data;
  },

  downloadAdminStatisticsPDF: async (
    class_name: string,
    term: string,
    academic_year: string
  ): Promise<Blob> => {
    const response = await apiClient.post(
      `${API}/admin/download`,
      { class_name, term, academic_year },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // ─── SHARED ENDPOINTS ────────────────────────────────────
  getTerms: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get(`${API}/terms`);
    return response.data.terms || [];
  },

  getAcademicYears: async (): Promise<string[]> => {
    const response = await apiClient.get(`${API}/academic-years`);
    return response.data.years || [];
  },

  // ─── HELPERS ─────────────────────────────────────────────
  getClasses: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/classes');
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.classes)) return response.data.classes;
    return [];
  },
};