// src/features/subjects/api/facultyService.ts
import apiClient from '../../../api/AuthService';

export const facultyService = {
  getAll: async () => {
    const response = await apiClient.get('/api/faculties');
    return Array.isArray(response.data) ? response.data : [];
  },
};