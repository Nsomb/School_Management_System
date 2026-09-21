// src/features/teachers/services/teacherServices.ts
import apiClient from '../../../api/AuthService';

export const teacherMarksService = {
  // ─── GET TEACHER PROFILE ─────────────────────────────────
  getProfile: async () => {
    try {
      const response = await apiClient.get('/api/teachers/profile');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch teacher profile:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch profile');
    }
  },

  // ─── GET ASSIGNED SUBJECTS ───────────────────────────────
  getMyAssignedSubjects: async () => {
    try {
      const response = await apiClient.get('/api/teachers/my/assigned-subjects');
      return response.data.subjects;
    } catch (error: any) {
      console.error('Failed to fetch assigned subjects:', error);

      if (error.response?.status === 403) {
        throw new Error('Access denied. You may not have permission to view these subjects.');
      }
      if (error.response?.status === 404) {
        throw new Error('No subjects assigned. Please contact administrator.');
      }

      throw new Error(error.response?.data?.error || 'Failed to fetch assigned subjects');
    }
  },

  // ─── GET CURRENT TEACHER ID ──────────────────────────────
  getCurrentTeacherId: (): number => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('Teacher not authenticated');
    }

    try {
      const user = JSON.parse(userStr);
      if (!user.id) {
        throw new Error('Teacher ID not found in user data');
      }
      return user.id;
    } catch {
      throw new Error('Failed to parse teacher data from storage');
    }
  },
};