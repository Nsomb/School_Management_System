// src/features/subjects/api/subjectService.ts
import apiClient from '../../../api/AuthService';
import type { Subject, SubjectCreateData } from '../types/subjectTypes';

const API_URL = '/api/subjects';

export const subjectService = {
  getAllSubjects: async (): Promise<Subject[]> => {
    const response = await apiClient.get(API_URL);
    return response.data.subjects || response.data || [];
  },

  createSubject: async (data: SubjectCreateData): Promise<Subject> => {
    const response = await apiClient.post(API_URL, data);
    return response.data.subject || response.data;
  },

  updateSubject: async (subjectId: string, data: SubjectCreateData): Promise<Subject> => {
    const response = await apiClient.put(`${API_URL}/${subjectId}`, data);
    return response.data.subject || response.data;
  },

  deleteSubject: async (subjectId: string): Promise<void> => {
    await apiClient.delete(`${API_URL}/${subjectId}`);
  },
};