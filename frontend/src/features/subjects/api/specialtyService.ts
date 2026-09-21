// src/features/subjects/api/specialtyService.ts
import apiClient from '../../../api/AuthService';
import type { Specialty } from '../types/subjectTypes';

export const specialtyService = {
  getByFaculty: async (facultyId: number): Promise<Specialty[]> => {
    try {
      const response = await apiClient.get(`/api/specialties/faculty/${facultyId}`);
      if (Array.isArray(response.data?.specialties)) return response.data.specialties;
      if (Array.isArray(response.data)) return response.data;
      return [];
    } catch {
      return [];
    }
  },
};