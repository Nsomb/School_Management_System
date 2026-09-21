// src/features/subjects/api/classService.ts
import apiClient from '../../../api/AuthService';

interface ClassItem {
  id: string;
  name: string;
}

const API_URL = '/api/classes';

export const classService = {
  getAllClasses: async (): Promise<ClassItem[]> => {
    const response = await apiClient.get(API_URL);

    if (Array.isArray(response.data)) {
      return response.data.map((c: any) => ({
        id: c.id,
        name: c.name || c.class_name || '',
      }));
    }
    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    return [];
  },
};